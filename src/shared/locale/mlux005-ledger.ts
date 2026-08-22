import type { LocaleMappingRecord, LocaleOccurrence } from './mapping';

export interface Mlux005TranslationEntry {
  readonly unitId: string;
  readonly en: string;
  readonly ru: string;
  readonly uz: string;
}

interface Mlux005RuntimeOccurrenceInput {
  readonly id: string;
  readonly context: string;
  readonly classification: LocaleOccurrence['classification'];
}

interface Mlux005RuntimeRecord {
  readonly unitId: string;
  readonly key: string;
  readonly english: string;
  readonly ru: string;
  readonly uz: string;
  readonly variables?: readonly string[];
  readonly plural?: boolean;
  readonly occurrences: readonly Mlux005RuntimeOccurrenceInput[];
}

const records: readonly Mlux005RuntimeRecord[] = [
  {
    unitId: 'MLUX-C0182',
    key: 'courseEditorSaveThisCourse',
    english: 'save this course',
    ru: 'сохранить этот курс',
    uz: 'bu kursni saqlash',
    occurrences: [
      {
        id: 'O0230',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:171 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0183',
    key: 'courseEditorSignInAgainBeforeContinuing',
    english: 'Sign in again before continuing.',
    ru: 'Войдите снова, чтобы продолжить.',
    uz: 'Davom etish uchun qayta kiring.',
    occurrences: [
      {
        id: 'O0231',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:172 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0235',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:198 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0242',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:276 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0278',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:525 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0317',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:149 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0321',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:178 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0329',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:221 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0184',
    key: 'courseEditorYouDoNotHavePermissionToChangeThisCourse',
    english: 'You do not have permission to change this course.',
    ru: 'У вас нет разрешения изменять этот курс.',
    uz: 'Bu kursni o‘zgartirish huquqingiz yo‘q.',
    occurrences: [
      {
        id: 'O0232',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:173 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0236',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:199 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0243',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:277 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0279',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:526 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0185',
    key: 'courseEditorThisCourseIsNoLongerAvailable',
    english: 'This course is no longer available.',
    ru: 'Этот курс больше недоступен.',
    uz: 'Bu kurs endi mavjud emas.',
    occurrences: [
      {
        id: 'O0233',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:174 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0237',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:200 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0244',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:278 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0186',
    key: 'courseEditorCreateThisLesson',
    english: 'create this lesson',
    ru: 'создать этот урок',
    uz: 'bu darsni yaratish',
    occurrences: [
      {
        id: 'O0234',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:197 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0187',
    key: 'courseEditorLoadingCourseEditor',
    english: 'Loading course editor',
    ru: 'Загрузка редактора курса',
    uz: 'Kurs muharriri yuklanmoqda',
    occurrences: [
      {
        id: 'O0239',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:259 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0188',
    key: 'courseEditorCourseEditorUnavailable',
    english: 'Course editor unavailable',
    ru: 'Редактор курса недоступен',
    uz: 'Kurs muharriri mavjud emas',
    occurrences: [
      {
        id: 'O0240',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:269 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0189',
    key: 'courseEditorLoadThisCourse',
    english: 'load this course',
    ru: 'загрузить этот курс',
    uz: 'bu kursni yuklash',
    occurrences: [
      {
        id: 'O0241',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:275 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0190',
    key: 'courseEditorEnterACourseTitle',
    english: 'Enter a course title.',
    ru: 'Введите название курса.',
    uz: 'Kurs nomini kiriting.',
    occurrences: [
      {
        id: 'O0245',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:296 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0246',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:297 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0301',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:14 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0191',
    key: 'courseEditorEnterALessonTitle',
    english: 'Enter a lesson title.',
    ru: 'Введите название урока.',
    uz: 'Dars nomini kiriting.',
    occurrences: [
      {
        id: 'O0247',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:309 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0248',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:310 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0332',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:242 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0333',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:243 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0192',
    key: 'courseEditorCourseTitle',
    english: 'Course title',
    ru: 'Название курса',
    uz: 'Kurs nomi',
    occurrences: [
      {
        id: 'O0250',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:333 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0267',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:51 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0305',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:161 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0193',
    key: 'courseEditorDescription',
    english: 'Description',
    ru: 'Описание',
    uz: 'Tavsif',
    occurrences: [
      {
        id: 'O0251',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:344 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0265',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:467 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0276',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:52 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0285',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:60 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0347',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:326 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0356',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:42 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0194',
    key: 'courseEditorPrice',
    english: 'Price',
    ru: 'Цена',
    uz: 'Narx',
    occurrences: [
      {
        id: 'O0252',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:354 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0281',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:53 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0195',
    key: 'courseEditorCurrency',
    english: 'Currency',
    ru: 'Валюта',
    uz: 'Valyuta',
    occurrences: [
      {
        id: 'O0253',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:366 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0282',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:54 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0196',
    key: 'courseEditorSavingCourse',
    english: 'Saving course',
    ru: 'Сохранение курса',
    uz: 'Kurs saqlanmoqda',
    occurrences: [
      {
        id: 'O0254',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:385 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0197',
    key: 'courseEditorLessons',
    english: 'Lessons',
    ru: 'Уроки',
    uz: 'Darslar',
    occurrences: [
      {
        id: 'O0255',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:404 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0198',
    key: 'courseEditorThisCourseHasNoLessonsYet',
    english: 'This course has no lessons yet.',
    ru: 'В этом курсе пока нет уроков.',
    uz: 'Bu kursda hali darslar yo‘q.',
    occurrences: [
      {
        id: 'O0256',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:406 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0199',
    key: 'courseEditorNotPublished',
    english: 'Not published',
    ru: 'Не опубликовано',
    uz: 'Nashr qilinmagan',
    occurrences: [
      {
        id: 'O0258',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:414 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0200',
    key: 'courseEditorCreateLesson',
    english: 'Create lesson',
    ru: 'Создать урок',
    uz: 'Dars yaratish',
    occurrences: [
      {
        id: 'O0259',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:439 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0201',
    key: 'courseEditorLessonTitle',
    english: 'Lesson title',
    ru: 'Название урока',
    uz: 'Dars nomi',
    occurrences: [
      {
        id: 'O0260',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:443 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0283',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:58 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0342',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:302 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0354',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:40 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0202',
    key: 'courseEditorLessonType',
    english: 'Lesson type',
    ru: 'Тип урока',
    uz: 'Dars turi',
    occurrences: [
      {
        id: 'O0261',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:453 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0284',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:59 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0343',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:312 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0355',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:41 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0203',
    key: 'courseEditorVideo',
    english: 'Video',
    ru: 'Видео',
    uz: 'Video',
    occurrences: [
      {
        id: 'O0262',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:461 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0344',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:320 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0204',
    key: 'courseEditorText',
    english: 'Text',
    ru: 'Текст',
    uz: 'Matn',
    occurrences: [
      {
        id: 'O0263',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:462 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0345',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:321 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0205',
    key: 'courseEditorPdf',
    english: 'PDF',
    ru: 'PDF',
    uz: 'PDF',
    occurrences: [
      {
        id: 'O0264',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:463 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0346',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:322 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0206',
    key: 'courseEditorCreatingLesson',
    english: 'Creating lesson',
    ru: 'Создание урока',
    uz: 'Dars yaratilmoqda',
    occurrences: [
      {
        id: 'O0266',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:502 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0207',
    key: 'courseEditorDeleteThisCourse',
    english: 'Delete this course?',
    ru: 'Удалить этот курс?',
    uz: 'Bu kurs o‘chirilsinmi?',
    occurrences: [
      {
        id: 'O0268',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:510 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0208',
    key: 'courseEditorDeleteThisLesson',
    english: 'Delete this lesson?',
    ru: 'Удалить этот урок?',
    uz: 'Bu dars o‘chirilsinmi?',
    occurrences: [
      {
        id: 'O0269',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:510 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0209',
    key: 'courseEditorDeleteCoursePermanent',
    english: 'Delete {courseTitle}. This action is permanent.',
    ru: 'Удалить курс «{courseTitle}»? Это действие необратимо.',
    uz: '{courseTitle} kursi o‘chirilsinmi? Bu amalni ortga qaytarib bo‘lmaydi.',
    occurrences: [
      {
        id: 'O0270',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:513 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0210',
    key: 'courseEditorDeleteLessonPermanent',
    english: 'Delete {lessonTitle}. This action is permanent.',
    ru: 'Удалить урок «{lessonTitle}»? Это действие необратимо.',
    uz: '{lessonTitle} darsi o‘chirilsinmi? Bu amalni ortga qaytarib bo‘lmaydi.',
    occurrences: [
      {
        id: 'O0271',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:514 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0211',
    key: 'courseEditorDeleteCourse',
    english: 'Delete course',
    ru: 'Удалить курс',
    uz: 'Kursni o‘chirish',
    occurrences: [
      {
        id: 'O0272',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:516 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0212',
    key: 'courseEditorDeleteLesson',
    english: 'Delete lesson',
    ru: 'Удалить урок',
    uz: 'Darsni o‘chirish',
    occurrences: [
      {
        id: 'O0273',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:516 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0213',
    key: 'courseEditorDeletingCourse',
    english: 'Deleting course...',
    ru: 'Удаление курса...',
    uz: 'Kurs o‘chirilmoqda...',
    occurrences: [
      {
        id: 'O0274',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:518 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0214',
    key: 'courseEditorDeletingLesson',
    english: 'Deleting lesson...',
    ru: 'Удаление урока...',
    uz: 'Dars o‘chirilmoqda...',
    occurrences: [
      {
        id: 'O0275',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:518 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0215',
    key: 'courseEditorDeleteThisItem',
    english: 'delete this item',
    ru: 'удалить этот элемент',
    uz: 'bu elementni o‘chirish',
    occurrences: [
      {
        id: 'O0277',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:524 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0216',
    key: 'courseEditorThisCourseOrLessonIsNoLongerAvailable',
    english: 'This course or lesson is no longer available.',
    ru: 'Курс или урок больше недоступен.',
    uz: 'Kurs yoki dars endi mavjud emas.',
    occurrences: [
      {
        id: 'O0280',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:527 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0217',
    key: 'courseEditorPublishThisLesson',
    english: 'Publish this lesson',
    ru: 'Опубликовать этот урок',
    uz: 'Bu darsni nashr qilish',
    occurrences: [
      {
        id: 'O0286',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:61 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0357',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:43 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0218',
    key: 'courseEnrollmentsNoEnrollmentsYet',
    english: 'No enrollments yet.',
    ru: 'Записей пока нет.',
    uz: 'Hali hech kim yozilmagan.',
    occurrences: [
      {
        id: 'O0288',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:130 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0219',
    key: 'courseEnrollmentsCourseEnrollmentsPagination',
    english: 'Course enrollments pagination',
    ru: 'Навигация по страницам записей на курс',
    uz: 'Kursga yozilishlar sahifalari',
    occurrences: [
      {
        id: 'O0289',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:149 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0220',
    key: 'courseEnrollmentsYouDoNotHavePermissionToViewTheseEnrollments',
    english: 'You do not have permission to view these enrollments.',
    ru: 'У вас нет разрешения просматривать эти записи.',
    uz: 'Bu yozilishlarni ko‘rish huquqingiz yo‘q.',
    occurrences: [
      {
        id: 'O0290',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:30 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0221',
    key: 'courseEnrollmentsThisCourseWasNotFound',
    english: 'This course was not found.',
    ru: 'Курс не найден.',
    uz: 'Kurs topilmadi.',
    occurrences: [
      {
        id: 'O0291',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:31 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0298',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:81 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0222',
    key: 'courseEnrollmentsWeCouldNotLoadCourseEnrollmentsTryAgain',
    english: 'We could not load course enrollments. Try again.',
    ru: 'Не удалось загрузить записи на курс. Повторите попытку.',
    uz: 'Kursga yozilishlarni yuklab bo‘lmadi. Qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0292',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:32 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0226',
    key: 'courseEnrollmentsLoadingCourseEnrollments',
    english: 'Loading course enrollments',
    ru: 'Загрузка записей на курс',
    uz: 'Kursga yozilishlar yuklanmoqda',
    occurrences: [
      {
        id: 'O0299',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:91 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0227',
    key: 'coursesYouHaveNotCreatedAnyCoursesYet',
    english: 'You have not created any courses yet.',
    ru: 'Вы ещё не создали ни одного курса.',
    uz: 'Siz hali hech qanday kurs yaratmagansiz.',
    occurrences: [
      {
        id: 'O0300',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:108 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0228',
    key: 'coursesYourCoursesPagination',
    english: 'Your courses pagination',
    ru: 'Навигация по страницам ваших курсов',
    uz: 'Kurslaringiz sahifalari',
    occurrences: [
      {
        id: 'O0302',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:144 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0229',
    key: 'coursesCreateCourse',
    english: 'Create course',
    ru: 'Создать курс',
    uz: 'Kurs yaratish',
    occurrences: [
      {
        id: 'O0303',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:155 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0230',
    key: 'coursesCourseTitleMustBe255CharactersOrFewer',
    english: 'Course title must be 255 characters or fewer.',
    ru: 'Название курса должно содержать не более 255 символов.',
    uz: 'Kurs nomi 255 ta belgidan oshmasligi kerak.',
    occurrences: [
      {
        id: 'O0304',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:16 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0231',
    key: 'coursesMaximum255Characters',
    english: 'Maximum 255 characters.',
    ru: 'Не более 255 символов.',
    uz: 'Ko‘pi bilan 255 ta belgi.',
    occurrences: [
      {
        id: 'O0306',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:164 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0232',
    key: 'coursesCreatingCourse',
    english: 'Creating course',
    ru: 'Создание курса',
    uz: 'Kurs yaratilmoqda',
    occurrences: [
      {
        id: 'O0307',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:188 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0233',
    key: 'coursesCourseCreated',
    english: 'Course created',
    ru: 'Курс создан',
    uz: 'Kurs yaratildi',
    occurrences: [
      {
        id: 'O0308',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:194 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0234',
    key: 'coursesSignInAgainToViewYourCourses',
    english: 'Sign in again to view your courses.',
    ru: 'Войдите снова, чтобы просмотреть свои курсы.',
    uz: 'Kurslaringizni ko‘rish uchun qayta kiring.',
    occurrences: [
      {
        id: 'O0309',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:28 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0235',
    key: 'coursesYouDoNotHavePermissionToViewInstructorCourses',
    english: 'You do not have permission to view instructor courses.',
    ru: 'У вас нет разрешения просматривать курсы преподавателя.',
    uz: 'O‘qituvchi kurslarini ko‘rish huquqingiz yo‘q.',
    occurrences: [
      {
        id: 'O0310',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:30 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0236',
    key: 'coursesTheRequestedCoursePageIsNotValidTryAnotherPage',
    english: 'The requested course page is not valid. Try another page.',
    ru: 'Запрошенная страница курсов недействительна. Откройте другую страницу.',
    uz: 'So‘ralgan kurslar sahifasi noto‘g‘ri. Boshqa sahifani oching.',
    occurrences: [
      {
        id: 'O0311',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:32 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0237',
    key: 'coursesWeCouldNotLoadYourCoursesTryAgain',
    english: 'We could not load your courses. Try again.',
    ru: 'Не удалось загрузить ваши курсы. Повторите попытку.',
    uz: 'Kurslaringizni yuklab bo‘lmadi. Qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0312',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:33 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0238',
    key: 'coursesLoadingYourCourses',
    english: 'Loading your courses',
    ru: 'Загрузка ваших курсов',
    uz: 'Kurslaringiz yuklanmoqda',
    occurrences: [
      {
        id: 'O0313',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:83 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0239',
    key: 'coursesCourseListUnavailable',
    english: 'Course list unavailable',
    ru: 'Список курсов недоступен',
    uz: 'Kurslar ro‘yxati mavjud emas',
    occurrences: [
      {
        id: 'O0314',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:88 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0240',
    key: 'lessonEditorTheLessonTypeChangedChooseAFileThatMatchesTheUpdatedLessonType',
    english: 'The lesson type changed. Choose a file that matches the updated lesson type.',
    ru: 'Тип урока изменился. Выберите файл, соответствующий новому типу урока.',
    uz: 'Dars turi o‘zgardi. Yangilangan dars turiga mos faylni tanlang.',
    occurrences: [
      {
        id: 'O0315',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:131 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0241',
    key: 'lessonEditorSaveThisLesson',
    english: 'save this lesson',
    ru: 'сохранить этот урок',
    uz: 'bu darsni saqlash',
    occurrences: [
      {
        id: 'O0316',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:148 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0242',
    key: 'lessonEditorYouDoNotHavePermissionToChangeThisLesson',
    english: 'You do not have permission to change this lesson.',
    ru: 'У вас нет разрешения изменять этот урок.',
    uz: 'Bu darsni o‘zgartirish huquqingiz yo‘q.',
    occurrences: [
      {
        id: 'O0318',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:150 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0322',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:179 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0330',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:222 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0243',
    key: 'lessonEditorThisLessonIsNoLongerAvailable',
    english: 'This lesson is no longer available.',
    ru: 'Этот урок больше недоступен.',
    uz: 'Bu dars endi mavjud emas.',
    occurrences: [
      {
        id: 'O0319',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:151 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0323',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:180 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0331',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:223 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0244',
    key: 'lessonEditorUploadThisFile',
    english: 'upload this file',
    ru: 'загрузить этот файл',
    uz: 'bu faylni yuklash',
    occurrences: [
      {
        id: 'O0320',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:177 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0245',
    key: 'lessonEditorChooseAFileThatMatchesThisLessonTypeAndSizeLimit',
    english: 'Choose a file that matches this lesson type and size limit.',
    ru: 'Выберите файл, соответствующий типу урока и ограничению по размеру.',
    uz: 'Dars turi va hajm chekloviga mos faylni tanlang.',
    occurrences: [
      {
        id: 'O0324',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:181 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0246',
    key: 'lessonEditorLessonNotFound',
    english: 'Lesson not found',
    ru: 'Урок не найден',
    uz: 'Dars topilmadi',
    occurrences: [
      {
        id: 'O0325',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:202 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0247',
    key: 'lessonEditorLoadingLessonEditor',
    english: 'Loading lesson editor',
    ru: 'Загрузка редактора урока',
    uz: 'Dars muharriri yuklanmoqda',
    occurrences: [
      {
        id: 'O0326',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:208 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0248',
    key: 'lessonEditorLessonEditorUnavailable',
    english: 'Lesson editor unavailable',
    ru: 'Редактор урока недоступен',
    uz: 'Dars muharriri mavjud emas',
    occurrences: [
      {
        id: 'O0327',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:214 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0249',
    key: 'lessonEditorLoadThisLesson',
    english: 'load this lesson',
    ru: 'загрузить этот урок',
    uz: 'bu darsni yuklash',
    occurrences: [
      {
        id: 'O0328',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:220 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0250',
    key: 'lessonEditorChooseAFileThatMatchesTheStatedTypeAndSizeLimit',
    english: 'Choose a file that matches the stated type and size limit.',
    ru: 'Выберите файл указанного типа, не превышающий ограничение по размеру.',
    uz: 'Ko‘rsatilgan tur va hajm chekloviga mos faylni tanlang.',
    occurrences: [
      {
        id: 'O0334',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:259 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0335',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:260 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0338',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:278 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0339',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:279 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0251',
    key: 'lessonEditorChooseAFileBeforeUploading',
    english: 'Choose a file before uploading.',
    ru: 'Перед загрузкой выберите файл.',
    uz: 'Yuklashdan oldin faylni tanlang.',
    occurrences: [
      {
        id: 'O0336',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:271 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0337',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:272 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0252',
    key: 'lessonEditorLessonDetails',
    english: 'Lesson details',
    ru: 'Сведения об уроке',
    uz: 'Dars tafsilotlari',
    occurrences: [
      {
        id: 'O0341',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:298 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0253',
    key: 'lessonEditorSavingLesson',
    english: 'Saving lesson',
    ru: 'Сохранение урока',
    uz: 'Dars saqlanmoqda',
    occurrences: [
      {
        id: 'O0348',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:359 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0254',
    key: 'lessonEditorUploadLessonFile',
    english: 'Upload lesson file',
    ru: 'Загрузить файл урока',
    uz: 'Dars faylini yuklash',
    occurrences: [
      {
        id: 'O0349',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:366 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0255',
    key: 'lessonEditorFileUploadIsUnavailableForTextLessons',
    english: 'File upload is unavailable for text lessons.',
    ru: 'Загрузка файлов недоступна для текстовых уроков.',
    uz: 'Matnli darslar uchun fayl yuklash mavjud emas.',
    occurrences: [
      {
        id: 'O0350',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:368 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0256',
    key: 'lessonEditorFileAcceptedAndQueued',
    english: 'File accepted and queued',
    ru: 'Файл принят и добавлен в очередь',
    uz: 'Fayl qabul qilindi va navbatga qo‘shildi',
    occurrences: [
      {
        id: 'O0351',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:370 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0257',
    key: 'lessonEditorLessonFile',
    english: 'Lesson file',
    ru: 'Файл урока',
    uz: 'Dars fayli',
    occurrences: [
      {
        id: 'O0352',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:377 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0358',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:47 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0258',
    key: 'lessonEditorUploadingFile',
    english: 'Uploading file',
    ru: 'Загрузка файла',
    uz: 'Fayl yuklanmoqda',
    occurrences: [
      {
        id: 'O0353',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:394 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0259',
    key: 'lessonEditorMp4WebmOrMovUpTo150Mb',
    english: 'MP4, WebM, or MOV up to 150 MB.',
    ru: 'MP4, WebM или MOV размером до 150 МБ.',
    uz: '150 MB gacha MP4, WebM yoki MOV.',
    occurrences: [
      {
        id: 'O0359',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:61 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0260',
    key: 'lessonEditorPdfUpTo50Mb',
    english: 'PDF up to 50 MB.',
    ru: 'PDF размером до 50 МБ.',
    uz: '50 MB gacha PDF.',
    occurrences: [
      {
        id: 'O0360',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:64 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0358',
    key: 'coursesYourCourses',
    english: 'Your courses',
    ru: 'Ваши курсы',
    uz: 'Kurslaringiz',
    occurrences: [
      {
        id: 'O0503',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:82 — Page: instructor-courses-page',
        classification: 'Visible UI copy',
      },
      {
        id: 'O0504',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:112 — Page: instructor-courses-page',
        classification: 'Accessibility only',
      },
    ],
  },
  {
    unitId: 'MLUX-C0359',
    key: 'courseEditorSaveCourse',
    english: 'Save course',
    ru: 'Сохранить курс',
    uz: 'Kursni saqlash',
    occurrences: [
      {
        id: 'O0505',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:400 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0360',
    key: 'courseEditorValidationFieldRequired',
    english: '{fieldLabel} is required.',
    ru: '{fieldLabel} обязательно.',
    uz: '{fieldLabel} kiritilishi shart.',
    occurrences: [
      {
        id: 'O0506',
        context:
          'src/features/instructor-course-editor/validation.ts:23 — Instructor editor / field validation',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0361',
    key: 'courseEditorValidationCheckField',
    english: 'Check {fieldLabel} and submit again.',
    ru: 'Проверьте поле {fieldLabel} и отправьте форму снова.',
    uz: 'Iltimos, {fieldLabel} maydonini tekshirib, qayta yuboring.',
    occurrences: [
      {
        id: 'O0507',
        context:
          'src/features/instructor-course-editor/validation.ts:27 — Instructor editor / field validation',
        classification: 'Visible UI copy + accessibility label',
      },
    ],
  },
  {
    unitId: 'MLUX-C0362',
    key: 'courseEditorValidationReviewHighlightedFields',
    english: 'Review the highlighted fields and submit again.',
    ru: 'Проверьте выделенные поля и отправьте форму снова.',
    uz: 'Belgilangan maydonlarni tekshirib, qayta yuboring.',
    occurrences: [
      {
        id: 'O0508',
        context:
          'src/features/instructor-course-editor/validation.ts:63 — Instructor editor / known 422',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0363',
    key: 'courseEditorValidationCouldNotProcessForm',
    english: 'We could not process this form. Check your details and try again.',
    ru: 'Не удалось обработать форму. Проверьте данные и повторите попытку.',
    uz: 'Shaklni qayta ishlab bo‘lmadi. Ma’lumotlarni tekshirib, qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0509',
        context:
          'src/features/instructor-course-editor/validation.ts:64 — Instructor editor / unknown 422',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0364',
    key: 'courseEditorValidationGenericAction',
    english: 'We could not {action}. Try again later.',
    ru: 'Не удалось {action}. Повторите попытку позже.',
    uz: '{action} amalga oshmadi. Keyinroq qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0510',
        context:
          'src/features/instructor-course-editor/validation.ts:68 — Instructor editor / generic failure',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0365',
    key: 'coursesCouldNotCreateCourseTryAgain',
    english: 'We could not create the course. Try again.',
    ru: 'Не удалось создать курс. Повторите попытку.',
    uz: 'Kursni yaratib bo‘lmadi. Qayta urinib ko‘ring.',
    occurrences: [
      {
        id: 'O0511',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:183 — Instructor courses / create failure',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0447',
    key: 'courseEditorCourseAddressInvalid',
    english: 'This course address is not valid.',
    ru: 'Адрес курса указан неверно.',
    uz: 'Kurs manzili noto‘g‘ri.',
    occurrences: [
      {
        id: 'O0630',
        context:
          'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:268 — Page: instructor-course-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0448',
    key: 'courseEnrollmentsCount',
    english: '{{count}} enrollment',
    ru: '{{count}} запись',
    uz: '{{count}} ta yozilish',
    variables: ['count'],
    plural: true,
    occurrences: [
      {
        id: 'O0632',
        context:
          'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:131 — Page: instructor-course-enrollments-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0449',
    key: 'coursesNewCourseActions',
    english: 'New course actions',
    ru: 'Действия с новым курсом',
    uz: 'Yangi kurs bo‘yicha amallar',
    occurrences: [
      {
        id: 'O0636',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:201 — Page: instructor-courses-page',
        classification: 'Accessibility only',
      },
    ],
  },
  {
    unitId: 'MLUX-C0450',
    key: 'lessonEditorLessonAddressInvalid',
    english: 'This lesson address is not valid.',
    ru: 'Адрес урока указан неверно.',
    uz: 'Dars manzili noto‘g‘ri.',
    occurrences: [
      {
        id: 'O0639',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:209 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0451',
    key: 'lessonEditorInstructorWorkspace',
    english: 'Instructor workspace',
    ru: 'Рабочая область преподавателя',
    uz: 'O‘qituvchi ish maydoni',
    occurrences: [
      {
        id: 'O0640',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:308 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0452',
    key: 'lessonEditorBackToCourse',
    english: 'Back to course',
    ru: 'Вернуться к курсу',
    uz: 'Kursga qaytish',
    occurrences: [
      {
        id: 'O0641',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:312 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0453',
    key: 'lessonEditorSaveLesson',
    english: 'Save lesson',
    ru: 'Сохранить урок',
    uz: 'Darsni saqlash',
    occurrences: [
      {
        id: 'O0642',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:379 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0454',
    key: 'lessonEditorProcessingStatusUnavailable',
    english: 'Processing status is unavailable.',
    ru: 'Статус обработки недоступен.',
    uz: 'Qayta ishlash holati mavjud emas.',
    occurrences: [
      {
        id: 'O0643',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:391 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0455',
    key: 'lessonEditorUploadFile',
    english: 'Upload file',
    ru: 'Загрузить файл',
    uz: 'Faylni yuklash',
    occurrences: [
      {
        id: 'O0644',
        context:
          'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:416 — Page: instructor-lesson-editor-page',
        classification: 'Visible UI copy',
      },
    ],
  },
  {
    unitId: 'MLUX-C0456',
    key: 'coursesCourseActions',
    english: '{{courseTitle}} actions',
    ru: 'Действия с курсом «{{courseTitle}}»',
    uz: '{{courseTitle}} kursi bo‘yicha amallar',
    variables: ['courseTitle'],
    occurrences: [
      {
        id: 'O0645',
        context:
          'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:128 — Page: instructor-courses-page',
        classification: 'Accessibility only',
      },
    ],
  },
];

export const MLUX_005_TRANSLATIONS: readonly Mlux005TranslationEntry[] = records.map(
  ({ unitId, english, ru, uz }) => ({ unitId, en: english, ru, uz }),
);

export const MLUX_005_RUNTIME_MAPPING: readonly LocaleMappingRecord[] = records.map((record) => ({
  unitId: record.unitId,
  namespace: 'instructor',
  key: record.key,
  english: record.english,
  variables:
    record.variables ??
    record.english.match(/\{[^}]+\}/g)?.map((value) => value.slice(1, -1)) ??
    [],
  plural: record.plural ?? false,
  resourceStatus: 'Draft',
  russian: { resource: 'Draft', review: 'Pending' },
  uzbek: { resource: 'Draft', review: 'Pending' },
  ownerTask: 'MLUX-005',
  occurrences: record.occurrences.map((occurrence) => ({ ...occurrence, ownerTask: 'MLUX-005' })),
}));

export type Mlux005SharedOccurrence = LocaleOccurrence & {
  readonly unitId: string;
};

const sharedOccurrenceSources = [
  {
    id: 'O0229',
    unitId: 'MLUX-C0031',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:102 — Page: instructor-course-editor-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0238',
    unitId: 'MLUX-C0169',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:249 — Page: instructor-course-editor-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0249',
    unitId: 'MLUX-C0039',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:329 — Page: instructor-course-editor-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0257',
    unitId: 'MLUX-C0168',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:414 — Page: instructor-course-editor-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0287',
    unitId: 'MLUX-C0007',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:92 — Page: instructor-course-editor-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0293',
    unitId: 'MLUX-C0007',
    context:
      'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:40 — Page: instructor-course-enrollments-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0294',
    unitId: 'MLUX-C0223',
    context:
      'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:54 — Page: instructor-course-enrollments-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0295',
    unitId: 'MLUX-C0224',
    context:
      'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:56 — Page: instructor-course-enrollments-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0296',
    unitId: 'MLUX-C0225',
    context:
      'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:58 — Page: instructor-course-enrollments-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0297',
    unitId: 'MLUX-C0033',
    context:
      'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:80 — Page: instructor-course-enrollments-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0340',
    unitId: 'MLUX-C0035',
    context:
      'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx:291 — Page: instructor-lesson-editor-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0629',
    unitId: 'MLUX-C0389',
    context:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:104 — Page: instructor-course-editor-page',
    classification: 'Accessibility only',
  },
  {
    id: 'O0631',
    unitId: 'MLUX-C0389',
    context:
      'src/pages/instructor-course-enrollments-page/InstructorCourseEnrollmentsPage.tsx:41 — Page: instructor-course-enrollments-page',
    classification: 'Accessibility only',
  },
  {
    id: 'O0633',
    unitId: 'MLUX-C0446',
    context:
      'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:122 — Page: instructor-courses-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0634',
    unitId: 'MLUX-C0031',
    context:
      'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:130 — Page: instructor-courses-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0635',
    unitId: 'MLUX-C0033',
    context:
      'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:136 — Page: instructor-courses-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0637',
    unitId: 'MLUX-C0031',
    context:
      'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:206 — Page: instructor-courses-page',
    classification: 'Visible UI copy',
  },
  {
    id: 'O0638',
    unitId: 'MLUX-C0033',
    context:
      'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:212 — Page: instructor-courses-page',
    classification: 'Visible UI copy',
  },
] as const satisfies readonly Omit<Mlux005SharedOccurrence, 'ownerTask'>[];

const sharedOccurrences = sharedOccurrenceSources.map(
  (occurrence): Mlux005SharedOccurrence => ({
    ...occurrence,
    ownerTask: 'MLUX-005',
  }),
);

export const MLUX_005_SHARED_OCCURRENCES: readonly Mlux005SharedOccurrence[] = sharedOccurrences;
