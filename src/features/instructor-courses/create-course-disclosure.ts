export const INSTRUCTOR_COURSE_CREATE_REQUEST_EVENT = 'learnhub:instructor-course-create-request';

export function requestInstructorCourseCreateDisclosure(): void {
  document.dispatchEvent(new Event(INSTRUCTOR_COURSE_CREATE_REQUEST_EVENT));
}
