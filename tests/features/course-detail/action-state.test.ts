import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  courseMutationDisposition,
  coursePrimaryAction,
} from '../../../src/features/course-detail';
import type { CourseDetail } from '../../../src/entities/course';
import type { SessionState } from '../../../src/features/auth-session';
import { ApiError } from '../../../src/shared/api';

const publishedCourse: CourseDetail = {
  id: 7,
  instructorId: 2,
  instructorName: 'Ada Lovelace',
  title: 'React',
  description: null,
  price: '0.00',
  currency: 'USD',
  publishedAt: '2026-07-01T00:00:00Z',
  lessons: [],
};

const anonymous: SessionState = { status: 'anonymous' };
const student: SessionState = {
  status: 'authenticated',
  user: {
    email: 'student@example.test',
    name: 'Student',
    surname: 'One',
    role: 'student',
    birthday: null,
    phoneNumber: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

const COURSE_ACTION_DESCRIPTOR_FIELDS = new Set(['kind', 'labelKey', 'helper', 'to']);
const COURSE_ACTION_HELPER_FIELDS = new Set(['linkTextKey', 'guidanceKey']);
const COURSE_ACTION_KINDS = new Set(['login', 'enroll', 'cart', 'disabled']);

function coursePrimaryActionDescriptorViolations(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    'action-state.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const keyAlias = sourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'CourseActionTranslationKey',
  );
  const primaryAction = sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'coursePrimaryAction',
  );
  if (!keyAlias || !ts.isUnionTypeNode(keyAlias.type) || !primaryAction?.body) {
    return ['missing Course Action descriptor schema'];
  }

  const localeKeys = new Set(
    keyAlias.type.types
      .filter(ts.isLiteralTypeNode)
      .map((type) => type.literal)
      .filter(ts.isStringLiteral)
      .map((literal) => literal.text),
  );
  const violations: string[] = [];
  const propertyName = (property: ts.PropertyAssignment): string =>
    property.name.getText(sourceFile);
  const stringProperty = (object: ts.ObjectLiteralExpression, name: string): string | null => {
    const property = object.properties.find(
      (candidate): candidate is ts.PropertyAssignment =>
        ts.isPropertyAssignment(candidate) && propertyName(candidate) === name,
    );
    return property && ts.isStringLiteral(property.initializer) ? property.initializer.text : null;
  };
  const assertLocaleKey = (property: ts.PropertyAssignment): void => {
    const name = propertyName(property);
    if (!ts.isStringLiteral(property.initializer)) {
      violations.push(`non-literal presentation descriptor ${name}`);
    } else if (!localeKeys.has(property.initializer.text)) {
      violations.push(`unrecognized presentation locale key ${name}: ${property.initializer.text}`);
    }
  };
  const inspectHelper = (property: ts.PropertyAssignment): void => {
    if (!ts.isObjectLiteralExpression(property.initializer)) {
      violations.push('non-object Course Action helper');
      return;
    }
    for (const candidate of property.initializer.properties) {
      if (!ts.isPropertyAssignment(candidate)) {
        violations.push('non-property Course Action helper member');
        continue;
      }
      const name = propertyName(candidate);
      if (!COURSE_ACTION_HELPER_FIELDS.has(name)) {
        violations.push(`unknown Course Action helper field ${name}`);
        continue;
      }
      assertLocaleKey(candidate);
    }
  };
  const inspectDescriptor = (descriptor: ts.ObjectLiteralExpression): void => {
    const kind = stringProperty(descriptor, 'kind');
    if (!kind || !COURSE_ACTION_KINDS.has(kind)) {
      violations.push(`unrecognized Course Action kind ${kind ?? 'missing'}`);
    }
    for (const candidate of descriptor.properties) {
      if (!ts.isPropertyAssignment(candidate)) {
        violations.push('non-property Course Action descriptor member');
        continue;
      }
      const name = propertyName(candidate);
      if (!COURSE_ACTION_DESCRIPTOR_FIELDS.has(name)) {
        violations.push(`unknown Course Action descriptor field ${name}`);
        continue;
      }
      if (name === 'labelKey') assertLocaleKey(candidate);
      if (name === 'helper') inspectHelper(candidate);
    }
  };
  const visitNode = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node) && stringProperty(node, 'kind')) inspectDescriptor(node);
    ts.forEachChild(node, visitNode);
  };
  visitNode(primaryAction.body);
  return violations;
}

function coursePrimaryActionSource(): string {
  return readFileSync(
    new URL('../../../src/features/course-detail/action-state.ts', import.meta.url),
    'utf8',
  );
}

describe('course primary action matrix', () => {
  it('carries locale-neutral guest and disabled descriptors with a safe internal login target', () => {
    expect(
      coursePrimaryAction({
        course: publishedCourse,
        session: anonymous,
        preflight: 'not-required',
      }),
    ).toEqual({
      kind: 'login',
      helper: {
        linkTextKey: 'course:signIn',
        guidanceKey: 'course:signInToEnrollForFree',
      },
      labelKey: 'course:enrollForFree',
      to: '/login?returnTo=%2Fcourses%2F7',
    });
    expect(
      coursePrimaryAction({
        course: { ...publishedCourse, price: '9.99' },
        session: anonymous,
        preflight: 'not-required',
      }),
    ).toEqual({
      kind: 'login',
      helper: {
        linkTextKey: 'course:signIn',
        guidanceKey: 'course:signInToAddCourseToCart',
      },
      labelKey: 'catalog:addToCart',
      to: '/login?returnTo=%2Fcourses%2F7',
    });
  });

  it('selects API-020 for eligible free students and API-005 for eligible paid students', () => {
    expect(
      coursePrimaryAction({ course: publishedCourse, session: student, preflight: 'eligible' }),
    ).toEqual({ kind: 'enroll', labelKey: 'catalog:enrollFree' });
    expect(
      coursePrimaryAction({
        course: { ...publishedCourse, price: '9.99' },
        session: student,
        preflight: 'eligible',
      }),
    ).toEqual({ kind: 'cart', labelKey: 'catalog:addToCart' });
  });

  it.each([
    [{ ...publishedCourse, publishedAt: null }, 'course:courseIsNotPublished'],
    [{ ...publishedCourse, price: '-1' }, 'course:actionUnavailable'],
    [{ ...publishedCourse, price: 'invalid' }, 'course:actionUnavailable'],
  ])('fails closed for draft or invalid-price courses', (course, labelKey) => {
    expect(coursePrimaryAction({ course, session: student, preflight: 'eligible' })).toEqual({
      kind: 'disabled',
      labelKey,
    });
  });

  it.each([
    ['already-enrolled', 'course:alreadyEnrolled'],
    ['already-in-cart', 'course:alreadyInCart'],
    ['unavailable', 'course:actionUnavailable'],
  ] as const)('fails closed for %s preflight', (preflight, labelKey) => {
    expect(coursePrimaryAction({ course: publishedCourse, session: student, preflight })).toEqual({
      kind: 'disabled',
      labelKey,
    });
  });

  it('permits only declared locale-key fields in the locale-neutral Course Action descriptor schema', () => {
    expect(coursePrimaryActionDescriptorViolations(coursePrimaryActionSource())).toEqual([]);
  });

  it('rejects an unseen presentation literal and a new display-bearing descriptor field', () => {
    const source = coursePrimaryActionSource();
    const literalMutation = source.replace(
      "labelKey: 'course:enrollForFree'",
      "labelKey: 'Please sign in to continue.'",
    );
    const fieldMutation = source.replace(
      "guidanceKey: 'course:signInToEnrollForFree',",
      "guidanceKey: 'course:signInToEnrollForFree',\n            helperText: 'Please sign in to continue.',",
    );

    expect(coursePrimaryActionDescriptorViolations(literalMutation)).toContain(
      'unrecognized presentation locale key labelKey: Please sign in to continue.',
    );
    expect(coursePrimaryActionDescriptorViolations(fieldMutation)).toContain(
      'unknown Course Action helper field helperText',
    );
  });
});

describe('course mutation disposition matrix', () => {
  it('returns locale-neutral message keys instead of rendered mutation copy', () => {
    expect(
      courseMutationDisposition(
        new ApiError({ kind: 'offline', status: null, message: 'private' }),
      ),
    ).toMatchObject({ messageKey: 'actionFailedCheckConnection' });
    expect(
      courseMutationDisposition(
        new ApiError({ kind: 'unauthorized', status: 401, message: 'private' }),
      ),
    ).toMatchObject({ messageKey: 'logInAgainToContinue' });
    expect(
      courseMutationDisposition(
        new ApiError({ kind: 'bad_request', status: 400, message: 'Course is not published' }),
      ),
    ).toMatchObject({ messageKey: 'courseIsNotPublished', refresh: 'detail' });
    expect(
      courseMutationDisposition(
        new ApiError({ kind: 'bad_request', status: 400, message: 'private' }),
      ),
    ).toMatchObject({ messageKey: 'actionCurrentlyUnavailable' });
  });

  it.each([
    [
      new ApiError({ kind: 'offline', status: null, message: 'offline' }),
      'retryable',
      null,
      'none',
      'actionFailedCheckConnection',
    ],
    [
      new ApiError({ kind: 'server', status: 500, message: 'server' }),
      'retryable',
      null,
      'none',
      'actionFailedCheckConnection',
    ],
    [
      new ApiError({ kind: 'unauthorized', status: 401, message: 'auth' }),
      'terminal',
      'unavailable',
      'none',
      'logInAgainToContinue',
    ],
    [
      new ApiError({ kind: 'forbidden', status: 403, message: 'forbidden' }),
      'terminal',
      'unavailable',
      'none',
      'actionUnavailableForAccount',
    ],
    [
      new ApiError({ kind: 'not_found', status: 404, message: 'Course not found' }),
      'terminal',
      'unavailable',
      'detail',
      'courseNoLongerAvailable',
    ],
    [
      new ApiError({ kind: 'bad_request', status: 400, message: 'Course is not published' }),
      'terminal',
      'unavailable',
      'detail',
      'courseIsNotPublished',
    ],
    [
      new ApiError({ kind: 'validation', status: 422, message: 'Course is not published' }),
      'terminal',
      'unavailable',
      'none',
      'actionCurrentlyUnavailable',
    ],
    [
      new ApiError({ kind: 'conflict', status: 409, message: 'Already enrolled in this course' }),
      'terminal',
      'already-enrolled',
      'enrollments',
      'courseAlreadyInLearningList',
    ],
    [
      new ApiError({ kind: 'conflict', status: 409, message: 'Course already in cart' }),
      'terminal',
      'already-in-cart',
      'cart',
      'courseAlreadyInCart',
    ],
    [
      new ApiError({ kind: 'conflict', status: 409, message: 'Unexpected conflict' }),
      'terminal',
      'unavailable',
      'preflight',
      'courseStateChangedAvailabilityRefreshed',
    ],
    [
      new ApiError({ kind: 'validation', status: 422, message: 'validation' }),
      'terminal',
      'unavailable',
      'none',
      'actionCurrentlyUnavailable',
    ],
    [new Error('unexpected'), 'terminal', 'unavailable', 'none', 'actionCurrentlyUnavailable'],
  ] as const)(
    'maps accepted outcome %# to a named retryable or terminal disposition',
    (error, kind, preflight, refresh, messageKey) => {
      expect(courseMutationDisposition(error)).toEqual(
        expect.objectContaining({ kind, preflight, refresh, messageKey }),
      );
    },
  );

  it('uses existing semantic types instead of mechanical projections', () => {
    const apiSource = readFileSync(
      new URL('../../../src/features/course-detail/api.ts', import.meta.url),
      'utf8',
    );
    const hookSource = readFileSync(
      new URL('../../../src/features/course-detail/useCourseDetail.ts', import.meta.url),
      'utf8',
    );

    expect(apiSource).not.toMatch(
      /LessonOutline\['items'\]\[number\]|EnrollmentList\['items'\]\[number\]/,
    );
    expect(hookSource).not.toMatch(/ReturnType<typeof useSession>\['state'\]/);
  });
});
