import { expect, test, type Page, type Request, type Route } from '@playwright/test';

const accessToken = 'fe014-test-only-instructor-token';
const courseId = 7;
const lessonId = 101;

interface InstructorProfileFixture {
  readonly email: string;
  readonly name: string;
  readonly surname: string;
  readonly role: 'instructor';
  readonly birthday: null;
  readonly phone_number: null;
  readonly created_at: string;
}

interface LessonFixture {
  readonly id: number;
  readonly course_id: number;
  readonly title: string;
  readonly lesson_type: 'video' | 'text' | 'pdf';
  readonly description: string | null;
  readonly is_published: boolean;
}

interface InstructorSummaryFixture {
  readonly id: number;
  readonly name: string;
  readonly surname: string;
}

interface CourseFixture {
  readonly id: number;
  readonly title: string;
  readonly description: string | null;
  readonly price: string;
  readonly currency: string;
  readonly instructor: InstructorSummaryFixture;
  readonly lessons: readonly LessonFixture[];
}

interface FixtureState {
  course: CourseFixture;
  lesson: LessonFixture;
  coursePatchStatus: number;
  lessonPatchStatus: number;
  lessonCreateStatus: number;
  uploadStatus: number;
  courseDeleteStatus: number;
  lessonDeleteStatus: number;
  courseDeleteGate?: Promise<void>;
  lessonDeleteGate?: Promise<void>;
  readonly requests: Request[];
}

interface DeferredAction {
  readonly promise: Promise<void>;
  resolve: () => void;
}

function deferredAction(): DeferredAction {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
}

const instructor: InstructorProfileFixture = {
  email: 'instructor@example.test',
  name: 'Indira',
  surname: 'Instructor',
  role: 'instructor',
  birthday: null,
  phone_number: null,
  created_at: '2026-08-08T00:00:00Z',
};

function createLesson(type: LessonFixture['lesson_type'] = 'video'): LessonFixture {
  return {
    id: lessonId,
    course_id: courseId,
    title: 'Contract-faithful lesson',
    lesson_type: type,
    description: 'An instructor-owned lesson for browser verification.',
    is_published: false,
  };
}

function createCourse(lessons: readonly LessonFixture[]): CourseFixture {
  return {
    id: courseId,
    title: 'Contract-faithful instructor course',
    description: 'An instructor-owned course for browser verification.',
    price: '20.00',
    currency: 'USD',
    instructor: { id: 3, name: 'Indira', surname: 'Instructor' },
    lessons,
  };
}

function createFixtureState(): FixtureState {
  const lesson = createLesson();
  return {
    course: createCourse([lesson]),
    lesson,
    coursePatchStatus: 200,
    lessonPatchStatus: 200,
    lessonCreateStatus: 200,
    uploadStatus: 200,
    courseDeleteStatus: 200,
    lessonDeleteStatus: 200,
    requests: [],
  };
}

function fulfilledCourse(course: CourseFixture) {
  return {
    ...course,
    lessons: course.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      course_id: lesson.course_id,
      lesson_type: lesson.lesson_type,
      description: lesson.description,
      is_published: lesson.is_published,
    })),
  };
}

function updatedCourse(course: CourseFixture) {
  return {
    id: course.id,
    instructor_id: course.instructor.id,
    title: course.title,
    description: course.description,
    price: course.price,
    currency: course.currency,
  };
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function failure(status: number, field = 'title') {
  if (status === 422) {
    return {
      detail: [
        {
          type: 'string_too_long',
          loc: ['body', field],
          msg: 'hostile fixture detail must never reach UI',
        },
      ],
    };
  }
  return { detail: 'hostile fixture detail must never reach UI' };
}

function api032RequestCount(requests: readonly Request[]): number {
  return requests.filter(
    (request) =>
      request.method() === 'POST' &&
      new URL(request.url()).pathname === `/lessons/${lessonId}/upload-file`,
  ).length;
}

async function expectAuthorized(request: Request): Promise<void> {
  expect(request.headers().authorization).toBe(`Bearer ${accessToken}`);
}

async function installInstructorFixture(page: Page, state: FixtureState): Promise<void> {
  await page.addInitScript(
    (token) => localStorage.setItem('learnhub.access-token', token),
    accessToken,
  );
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (path === '/me') {
      expect(method).toBe('GET');
      await expectAuthorized(request);
      await fulfillJson(route, 200, instructor);
      return;
    }
    if (path === `/courses/${courseId}` && method === 'GET') {
      await expectAuthorized(request);
      await fulfillJson(route, 200, fulfilledCourse(state.course));
      return;
    }
    if (path === `/lessons/${lessonId}` && method === 'GET') {
      await expectAuthorized(request);
      await fulfillJson(route, 200, state.lesson);
      return;
    }
    if (path === '/courses/my' && method === 'GET') {
      await expectAuthorized(request);
      await fulfillJson(route, 200, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
      return;
    }

    const editorMutation =
      path === `/courses/${courseId}` ||
      path === `/courses/${courseId}/lessons` ||
      path === `/courses/${courseId}/lessons/${lessonId}` ||
      path === `/lessons/${lessonId}` ||
      path === `/lessons/${lessonId}/upload-file`;
    if (!editorMutation) {
      await route.continue();
      return;
    }

    await expectAuthorized(request);
    state.requests.push(request);
    if (path === `/courses/${courseId}` && method === 'PATCH') {
      expect(request.headers()['content-type']).toContain('application/json');
      const body = request.postDataJSON() as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual(['currency', 'description', 'price', 'title']);
      if (state.coursePatchStatus !== 200) {
        await fulfillJson(route, state.coursePatchStatus, failure(state.coursePatchStatus));
        return;
      }
      state.course = { ...state.course, ...body } as CourseFixture;
      await fulfillJson(route, 200, updatedCourse(state.course));
      return;
    }
    if (path === `/courses/${courseId}/lessons` && method === 'POST') {
      expect(request.headers()['content-type']).toContain('application/json');
      const body = request.postDataJSON() as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual([
        'description',
        'is_published',
        'lesson_type',
        'title',
      ]);
      if (state.lessonCreateStatus !== 200) {
        await fulfillJson(route, state.lessonCreateStatus, failure(state.lessonCreateStatus));
        return;
      }
      const createdLesson: LessonFixture = {
        id: 102,
        course_id: courseId,
        title: String(body.title),
        lesson_type: body.lesson_type as LessonFixture['lesson_type'],
        description: body.description as string | null,
        is_published: body.is_published as boolean,
      };
      state.course = { ...state.course, lessons: [...state.course.lessons, createdLesson] };
      await fulfillJson(route, 200, createdLesson);
      return;
    }
    if (path === `/courses/${courseId}/lessons/${lessonId}` && method === 'DELETE') {
      await state.lessonDeleteGate;
      if (state.lessonDeleteStatus !== 200) {
        await fulfillJson(route, state.lessonDeleteStatus, failure(state.lessonDeleteStatus));
        return;
      }
      state.course = {
        ...state.course,
        lessons: state.course.lessons.filter((lesson) => lesson.id !== lessonId),
      };
      await fulfillJson(route, 200, { message: 'Lesson deleted.' });
      return;
    }
    if (path === `/courses/${courseId}` && method === 'DELETE') {
      await state.courseDeleteGate;
      if (state.courseDeleteStatus !== 200) {
        await fulfillJson(route, state.courseDeleteStatus, failure(state.courseDeleteStatus));
        return;
      }
      await fulfillJson(route, 200, { message: 'Course deleted.' });
      return;
    }
    if (path === `/lessons/${lessonId}` && method === 'PATCH') {
      expect(request.headers()['content-type']).toContain('application/json');
      const body = request.postDataJSON() as Record<string, unknown>;
      expect(Object.keys(body).sort()).toEqual([
        'description',
        'is_published',
        'lesson_type',
        'title',
      ]);
      if (state.lessonPatchStatus !== 200) {
        await fulfillJson(
          route,
          state.lessonPatchStatus,
          failure(state.lessonPatchStatus, 'is_published'),
        );
        return;
      }
      state.lesson = {
        ...state.lesson,
        title: String(body.title),
        lesson_type: body.lesson_type as LessonFixture['lesson_type'],
        description: body.description as string | null,
        is_published: body.is_published as boolean,
      };
      await fulfillJson(route, 200, state.lesson);
      return;
    }
    if (path === `/lessons/${lessonId}/upload-file` && method === 'POST') {
      expect(request.headers()['content-type']).toContain('multipart/form-data');
      const multipart = request.postDataBuffer();
      expect(multipart?.toString('utf8')).toContain('name="file"');
      if (state.uploadStatus !== 200) {
        await fulfillJson(route, state.uploadStatus, failure(state.uploadStatus, 'file'));
        return;
      }
      await fulfillJson(route, 200, state.lesson);
      return;
    }
    await route.abort();
  });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.client);
  expect(widths.body).toBeLessThanOrEqual(widths.client);
}

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push(message.text());
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), 'unexpected browser runtime errors').toEqual([]);
});

async function expectInstructorCanvasToMeetFooter(page: Page) {
  const footer = page.getByRole('contentinfo');
  await footer.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(() => {
      const canvas = document.querySelector('article');
      const footerElement = document.querySelector('footer');
      if (!canvas || !footerElement) throw new Error('Expected Instructor canvas and footer.');
      return canvas.getBoundingClientRect().bottom - footerElement.getBoundingClientRect().top;
    }),
  ).toBeGreaterThanOrEqual(-1);
}

test('uses authenticated course PATCH and lesson POST contracts, including safe 422 focus', async ({
  page,
}) => {
  const state = createFixtureState();
  await installInstructorFixture(page, state);
  await page.goto(`/instructor/courses/${courseId}/edit`, { waitUntil: 'commit' });

  await expect(page.getByRole('heading', { name: 'Edit course' })).toBeVisible();
  await expectInstructorCanvasToMeetFooter(page);
  state.coursePatchStatus = 422;
  await page.getByLabel('Course title').fill('An intentionally invalid contract course title');
  await page.getByRole('button', { name: 'Save course' }).click();
  await expect(page.getByLabel('Course title')).toBeFocused();
  await expect(page.getByLabel('Course title')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Check course title and submit again.')).toBeVisible();
  await expect(page.getByText('hostile fixture detail must never reach UI')).toHaveCount(0);

  state.coursePatchStatus = 200;
  await page.getByLabel('Course title').fill('Saved course title');
  await page.getByRole('button', { name: 'Save course' }).click();
  await expect
    .poll(() => state.requests.filter((request) => request.method() === 'PATCH'))
    .toHaveLength(2);

  state.lessonCreateStatus = 422;
  await page.getByLabel('Lesson title').fill('Browser-created lesson');
  await page.getByRole('checkbox', { name: 'Publish this lesson' }).check();
  await page.getByRole('button', { name: 'Create lesson' }).click();
  await expect(page.getByLabel('Lesson title')).toBeFocused();
  await expect(page.getByLabel('Lesson title')).toHaveAttribute('aria-invalid', 'true');

  state.lessonCreateStatus = 200;
  await page.getByLabel('Lesson title').fill('Browser-created lesson');
  await page.getByRole('button', { name: 'Create lesson' }).click();
  await expect(page.getByText('Browser-created lesson')).toBeVisible();
  expect(state.requests.filter((request) => request.method() === 'POST')).toHaveLength(2);
});

test('returns from the editor through the contextual Instructor courses link without a mutation', async ({
  page,
}) => {
  const state = createFixtureState();
  await installInstructorFixture(page, state);
  await page.goto(`/instructor/courses/${courseId}/edit`, { waitUntil: 'commit' });

  const returnLink = page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Instructor courses' });
  await expect(returnLink).toHaveAttribute('href', '/instructor/courses');
  await returnLink.focus();
  await expect(returnLink).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL('/instructor/courses');
  expect(state.requests.filter((request) => request.method() !== 'GET')).toEqual([]);
});

test('confirms named destructive actions and restores keyboard focus on cancel', async ({
  page,
}) => {
  const state = createFixtureState();
  await installInstructorFixture(page, state);
  await page.goto(`/instructor/courses/${courseId}/edit`, { waitUntil: 'commit' });

  const deleteLesson = page.getByRole('button', { name: 'Delete lesson' });
  await expect(deleteLesson).toBeVisible();
  await deleteLesson.focus();
  await deleteLesson.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('Delete Contract-faithful lesson.');
  await page.keyboard.press('Escape');
  await expect(deleteLesson).toBeFocused();

  state.lessonDeleteStatus = 404;
  await deleteLesson.click();
  await page.getByRole('button', { name: 'Delete lesson' }).last().click();
  await expect(page.getByRole('dialog')).toContainText(
    'This course or lesson is no longer available.',
  );
  await expect(page.getByText('hostile fixture detail must never reach UI')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(deleteLesson).toBeFocused();

  state.lessonDeleteStatus = 200;
  await deleteLesson.click();
  await page.getByRole('button', { name: 'Delete lesson' }).last().click();
  await expect(page.getByText('Contract-faithful lesson')).toHaveCount(0);

  await page.getByRole('button', { name: 'Delete course' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Delete Contract-faithful instructor course.',
  );
  await page.getByRole('button', { name: 'Delete course' }).last().click();
  await expect(page).toHaveURL(/\/instructor\/courses$/);
  expect(state.requests.filter((request) => request.method() === 'DELETE')).toHaveLength(3);
});

test('announces truthful pending course and lesson deletes without duplicate mutations', async ({
  page,
}) => {
  const state = createFixtureState();
  const lessonGate = deferredAction();
  state.lessonDeleteGate = lessonGate.promise;
  state.lessonDeleteStatus = 404;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installInstructorFixture(page, state);
  await page.goto(`/instructor/courses/${courseId}/edit`, { waitUntil: 'commit' });

  const deleteLesson = page.getByRole('button', { name: 'Delete lesson' });
  await deleteLesson.focus();
  await deleteLesson.press('Enter');
  const lessonDialog = page.getByRole('dialog', { name: 'Delete this lesson?' });
  await lessonDialog.getByRole('button', { name: 'Delete lesson' }).press('Enter');
  const pendingLesson = lessonDialog.getByRole('button', { name: 'Deleting lesson...' });
  await expect(pendingLesson).toBeDisabled();
  await expect(pendingLesson).toHaveAttribute('aria-busy', 'true');
  await expect(lessonDialog.getByRole('status')).toHaveText('Deleting lesson...');
  await expect
    .poll(() => state.requests.filter((request) => request.method() === 'DELETE'))
    .toHaveLength(1);
  await page.keyboard.press('Enter');
  await expect
    .poll(() => state.requests.filter((request) => request.method() === 'DELETE'))
    .toHaveLength(1);

  for (const width of [320, 390, 768, 1280] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(lessonDialog).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await expectNoHorizontalOverflow(page);
  await expect(pendingLesson.locator('[data-part="spinner"]')).toHaveCSS('animation-name', 'none');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });

  lessonGate.resolve();
  await expect(lessonDialog.getByRole('alert')).toContainText(
    'This course or lesson is no longer available.',
  );
  await lessonDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(deleteLesson).toBeFocused();

  const courseGate = deferredAction();
  state.courseDeleteGate = courseGate.promise;
  const deleteCourse = page.getByRole('button', { name: 'Delete course' });
  await deleteCourse.click();
  const courseDialog = page.getByRole('dialog', { name: 'Delete this course?' });
  await courseDialog.getByRole('button', { name: 'Delete course' }).click();
  const pendingCourse = courseDialog.getByRole('button', { name: 'Deleting course...' });
  await expect(pendingCourse).toBeDisabled();
  await expect(pendingCourse).toHaveAttribute('aria-busy', 'true');
  await expect(courseDialog.getByRole('status')).toHaveText('Deleting course...');
  await expect
    .poll(() => state.requests.filter((request) => request.method() === 'DELETE'))
    .toHaveLength(2);
  const pendingCourseBox = await pendingCourse.boundingBox();
  if (!pendingCourseBox) throw new Error('Pending course confirmation geometry is unavailable.');
  await page.mouse.click(
    pendingCourseBox.x + pendingCourseBox.width / 2,
    pendingCourseBox.y + pendingCourseBox.height / 2,
  );
  await expect
    .poll(() => state.requests.filter((request) => request.method() === 'DELETE'))
    .toHaveLength(2);

  courseGate.resolve();
  await expect(page).toHaveURL(/\/instructor\/courses$/);
});

test('uses lesson PATCH and contract-faithful multipart upload without terminal or replacement UI', async ({
  page,
}) => {
  const state = createFixtureState();
  await installInstructorFixture(page, state);
  await page.goto(`/instructor/lessons/${lessonId}/edit`, { waitUntil: 'commit' });

  await expect(page.getByRole('heading', { name: 'Edit lesson' })).toBeVisible();
  state.lessonPatchStatus = 422;
  await page.getByRole('checkbox', { name: 'Publish this lesson' }).check();
  await page.getByRole('button', { name: 'Save lesson' }).click();
  await expect(page.getByRole('checkbox', { name: 'Publish this lesson' })).toBeFocused();
  await expect(page.getByRole('checkbox', { name: 'Publish this lesson' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );

  state.lessonPatchStatus = 200;
  await page.getByLabel('Lesson title').fill('Updated browser lesson');
  await page.getByRole('button', { name: 'Save lesson' }).click();
  await expect
    .poll(() => state.requests.filter((request) => request.method() === 'PATCH'))
    .toHaveLength(2);

  const uploadRequestsBeforeTypeChanges = api032RequestCount(state.requests);
  const lessonFile = page.locator('input[name="file"]');
  await lessonFile.setInputFiles({
    name: 'browser-video.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('video'),
  });
  await expect(page.getByRole('button', { name: 'Upload file' })).toBeEnabled();

  await page.getByRole('combobox', { name: 'Lesson type' }).selectOption('pdf');
  await page.getByRole('button', { name: 'Save lesson' }).click();
  await expect(
    page.getByText('The lesson type changed. Choose a file that matches the updated lesson type.'),
  ).toBeVisible();
  await expect(lessonFile).toHaveValue('');
  await expect(lessonFile).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: 'Upload file' })).toBeDisabled();
  expect(api032RequestCount(state.requests)).toBe(uploadRequestsBeforeTypeChanges);

  await lessonFile.setInputFiles({
    name: 'browser-notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('pdf'),
  });
  await expect(page.getByRole('button', { name: 'Upload file' })).toBeEnabled();

  await page.getByRole('combobox', { name: 'Lesson type' }).selectOption('video');
  await page.getByRole('button', { name: 'Save lesson' }).click();
  await expect(
    page.getByText('The lesson type changed. Choose a file that matches the updated lesson type.'),
  ).toBeVisible();
  await expect(lessonFile).toHaveValue('');
  await expect(lessonFile).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: 'Upload file' })).toBeDisabled();
  expect(api032RequestCount(state.requests)).toBe(uploadRequestsBeforeTypeChanges);

  await lessonFile.setInputFiles({
    name: 'browser-video.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('video'),
  });
  await expect(page.getByRole('button', { name: 'Upload file' })).toBeEnabled();
  await page.getByRole('button', { name: 'Upload file' }).click();
  await expect(page.getByText('File accepted and saved')).toBeVisible();
  await expect(page.getByText('Processing status is unavailable.')).toBeVisible();
  await expect(page.locator('input[name="file"]')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /upload|retry|cancel|download|play/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/progress|ready|complete|replacement/i)).toHaveCount(0);
  expect(api032RequestCount(state.requests)).toBe(uploadRequestsBeforeTypeChanges + 1);
});

test('renders safe upload errors and keeps controls responsive under reduced motion', async ({
  page,
}) => {
  const state = createFixtureState();
  state.uploadStatus = 422;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installInstructorFixture(page, state);
  await page.goto(`/instructor/lessons/${lessonId}/edit`, { waitUntil: 'commit' });

  const lessonFile = page.locator('input[name="file"]');
  await expect(lessonFile).toHaveCount(1);
  await lessonFile.setInputFiles({
    name: 'browser-video.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from('video'),
  });
  await page.getByRole('button', { name: 'Upload file' }).click();
  await expect(page.getByRole('button', { name: 'Lesson file' })).toBeFocused();
  await expect(page.locator('input[name="file"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Check lesson file and submit again.')).toBeVisible();
  await expect(page.getByText('hostile fixture detail must never reach UI')).toHaveCount(0);

  for (const width of [320, 640, 1024, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Edit lesson' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await expectNoHorizontalOverflow(page);
});
