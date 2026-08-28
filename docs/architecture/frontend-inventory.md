# Frontend Live Inventory

> **Snapshot authority:** [`src/app/router/route-registry.ts`](../../src/app/router/route-registry.ts) for registered routes and the live `src/` filesystem for layer directories.
> **Invariant contract:** [`layer-map.md`](./layer-map.md)
> **Verification:** `npm test -- tests/quality/architecture-inventory.test.ts`

This is a maintained live snapshot, not a proposed architecture. The executable conformance test
checks registered route IDs/paths, documented page-module mappings against `AppRouter` and the
public page index, the six top-level layer directories, and their immediate child directories. It
deliberately does not infer semantic ownership from folders.

## Registered routes

| Page ID  | Path                                          | Title              | Page module                                                                    |
| -------- | --------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| PAGE-001 | `/`                                           | Course catalog     | `pages/catalog-page` (`CatalogPage`)                                           |
| PAGE-002 | `/courses/:courseId`                          | Course details     | `pages/course-detail-page` (`CourseDetailPage`)                                |
| PAGE-003 | `/signup`                                     | Create account     | `pages/signup-page` (`SignupPage`)                                             |
| PAGE-004 | `/login`                                      | Log in             | `pages/login-page` (`LoginPage`)                                               |
| PAGE-005 | `/forgot-password`                            | Forgot password    | `pages/forgot-password-page` (`ForgotPasswordPage`)                            |
| PAGE-006 | `/reset-password`                             | Reset password     | `pages/reset-password-page` (`ResetPasswordPage`)                              |
| PAGE-007 | `/cart`                                       | Cart               | `pages/cart-page` (`CartPage`)                                                 |
| PAGE-008 | `/learning`                                   | My learning        | `pages/learning-list-page` (`LearningListPage`)                                |
| PAGE-009 | `/learning/enrollments/:enrollmentId`         | Learning details   | `pages/learning-detail-page` (`LearningDetailPage`)                            |
| PAGE-010 | `/instructor/courses`                         | Instructor courses | `pages/instructor-courses-page` (`InstructorCoursesPage`)                      |
| PAGE-011 | `/instructor/courses/:courseId/edit`          | Edit course        | `pages/instructor-course-editor-page` (`InstructorCourseEditorPage`)           |
| PAGE-012 | `/instructor/courses/:courseId/enrollments`   | Course enrollments | `pages/instructor-course-enrollments-page` (`InstructorCourseEnrollmentsPage`) |
| PAGE-013 | `/instructor/lessons/:lessonId/edit`          | Edit lesson        | `pages/instructor-lesson-editor-page` (`InstructorLessonEditorPage`)           |
| PAGE-014 | `/learning/enrollments/:enrollmentId/ai-chat` | Course assistant   | `pages/ai-chat-page` (`AiChatPage`)                                            |
| PAGE-015 | `/ai-chat`                                    | AI assistant       | `pages/ai-chat-page` (`AiChatPage`)                                            |

## Top-level layer owners

| Layer      | Directory      | Current owner boundary                                        |
| ---------- | -------------- | ------------------------------------------------------------- |
| `app`      | `src/app`      | Router, layouts, query provider, and application composition. |
| `pages`    | `src/pages`    | Route-level page composition and its public index.            |
| `widgets`  | `src/widgets`  | Reusable composite interface sections and public index.       |
| `features` | `src/features` | Capability/flow slices and their public entry points.         |
| `entities` | `src/entities` | Domain models and render adapters.                            |
| `shared`   | `src/shared`   | Foundation UI, transport, accessibility, and type utilities.  |

## Current direct module directories

- `app`: `layouts`, `query`, `router`
- `pages`: `ai-chat-page`, `cart-page`, `catalog-page`, `course-detail-page`, `forgot-password-page`, `instructor-course-editor-page`, `instructor-course-enrollments-page`, `instructor-courses-page`, `instructor-lesson-editor-page`, `learning-detail-page`, `learning-list-page`, `login-page`, `reset-password-page`, `signup-page`
- `widgets`: `catalog-filter-bar`, `course-chat`, `enrollment-progress-panel`
- `features`: `auth-session`, `auth-workflows`, `cart-workflow`, `catalog-discovery`, `checkout-cart`, `course-action-reconciliation`, `course-chat`, `course-detail`, `course-reviews`, `instructor-course-editor`, `instructor-courses`, `learning-progress`, `media-access`
- `entities`: `api`, `cart`, `course`, `enrollment`, `review`, `user`
- `shared`: `accessibility`, `api`, `locale`, `types`, `ui`

## Maintenance rule

When a registered route ID/path, top-level layer directory, or immediate child module directory
intentionally changes, update this document in the same change and run the verification command
above. Keep one direct-module row per layer, with backtick-quoted nonempty names separated only by
comma-space; bare, trailing, or other residual text is not valid inventory syntax. Historical
planning names and proposed structures belong in their source records; they are not current
inventory entries.
