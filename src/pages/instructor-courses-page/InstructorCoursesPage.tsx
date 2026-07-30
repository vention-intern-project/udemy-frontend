import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { requestCreateCourse } from '@features/instructor-courses';
import { useSession } from '@features/auth-session';
import { Button, Input, Notice } from '@shared/ui/primitives';
import styles from './InstructorCoursesPage.module.css';

const COURSE_TITLE_MAX_LENGTH = 255;

function titleValidationMessage(value: string): string | null {
  if (value.trim() === '') return 'Enter a course title.';
  if (value.length > COURSE_TITLE_MAX_LENGTH)
    return 'Course title must be 255 characters or fewer.';
  return null;
}

export function InstructorCoursesPage() {
  const session = useSession();
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const failureSummaryRef = useRef<HTMLDivElement>(null);
  const create = useMutation({
    mutationFn: () => requestCreateCourse(session, { title: title.trim() }),
  });
  useEffect(() => {
    if (create.isError) failureSummaryRef.current?.focus({ preventScroll: true });
  }, [create.isError]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending) return;
    const validationMessage = titleValidationMessage(title);
    if (validationMessage !== null) {
      setTitleError(validationMessage);
      titleRef.current?.focus();
      return;
    }
    setTitleError(null);
    create.mutate();
  };
  return (
    <article className={styles.page}>
      <header>
        <h1>Instructor courses</h1>
        <p>Manage course creation and enrollments from one workspace.</p>
      </header>
      <Notice tone="info" title="Course listing unavailable">
        Your backend does not currently provide an instructor-owned course list.
      </Notice>
      <section className={styles.panel} aria-labelledby="create-course-heading">
        <h2 id="create-course-heading">Create course</h2>
        <form onSubmit={submit} className={styles.form}>
          <Input
            ref={titleRef}
            name="title"
            label="Course title"
            value={title}
            maxLength={COURSE_TITLE_MAX_LENGTH}
            helpText="Maximum 255 characters."
            error={titleError}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError !== null) setTitleError(null);
            }}
            onInvalid={(event) => {
              event.preventDefault();
              const validationMessage = titleValidationMessage(title);
              if (validationMessage !== null) setTitleError(validationMessage);
              titleRef.current?.focus();
            }}
            required
          />
          {create.isError ? (
            <div ref={failureSummaryRef} tabIndex={-1} role="alert">
              <Notice tone="error" politeness="off">
                We could not create the course. Try again.
              </Notice>
            </div>
          ) : null}
          <Button
            type="submit"
            state={create.isPending ? 'loading' : 'idle'}
            loadingLabel="Creating course"
          >
            Create course
          </Button>
        </form>
        {create.data ? (
          <Notice tone="success" title="Course created">
            <p>{create.data.title}</p>
            <p>
              <Link to={`/instructor/courses/${create.data.id}/edit`}>Edit course</Link> ·{' '}
              <Link to={`/instructor/courses/${create.data.id}/enrollments`}>
                Course enrollments
              </Link>
            </p>
          </Notice>
        ) : null}
      </section>
    </article>
  );
}
