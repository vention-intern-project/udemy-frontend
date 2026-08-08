import { ApiError } from '@shared/api';

export interface InstructorEditorFieldDefinition {
  readonly field: string;
  readonly label: string;
}

export interface InstructorEditorErrorCopy {
  readonly action: string;
  readonly forbidden: string;
  readonly notFound: string;
  readonly unauthorized: string;
  readonly badRequest?: string;
}

export interface InstructorEditorFormFailure {
  readonly fields: Readonly<Record<string, string>>;
  readonly summary: string;
}

function safeFieldMessage(label: string, type: string): string {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('missing') || normalizedType.includes('required')) {
    return `${label} is required.`;
  }

  return `Check ${label.toLowerCase()} and submit again.`;
}

export function mapInstructorEditorFormFailure(
  error: unknown,
  copy: InstructorEditorErrorCopy,
  fields: Readonly<Record<string, InstructorEditorFieldDefinition>>,
): InstructorEditorFormFailure {
  if (error instanceof ApiError && error.status === 401) {
    return { fields: {}, summary: copy.unauthorized };
  }
  if (error instanceof ApiError && error.status === 403) {
    return { fields: {}, summary: copy.forbidden };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { fields: {}, summary: copy.notFound };
  }
  if (error instanceof ApiError && error.status === 400 && copy.badRequest) {
    return { fields: {}, summary: copy.badRequest };
  }
  if (error instanceof ApiError && error.status === 422) {
    const mappedFields: Record<string, string> = {};
    error.issues.forEach((issue) => {
      const fieldName = String(issue.location[issue.location.length - 1]);
      const definition = Object.prototype.hasOwnProperty.call(fields, fieldName)
        ? fields[fieldName]
        : undefined;
      if (definition && !mappedFields[definition.field]) {
        mappedFields[definition.field] = safeFieldMessage(definition.label, issue.type);
      }
    });

    return {
      fields: mappedFields,
      summary:
        Object.keys(mappedFields).length > 0
          ? 'Review the highlighted fields and submit again.'
          : 'We could not process this form. Check your details and try again.',
    };
  }

  return { fields: {}, summary: `We could not ${copy.action}. Try again later.` };
}
