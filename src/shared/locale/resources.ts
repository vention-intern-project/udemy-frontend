import type { Resource } from 'i18next';

import { MLUX_004_RUNTIME_MAPPING, MLUX_004_TRANSLATIONS } from './mapping';
import { MLUX_005_RUNTIME_MAPPING, MLUX_005_TRANSLATIONS } from './mlux005-ledger';
import {
  MLUX_006_FOLLOWUP_RUNTIME_MAPPING,
  MLUX_006_FOLLOWUP_TRANSLATIONS,
} from './mlux006-followup-ledger';
import type { Locale } from './types';

const BASE_LOCALE_RESOURCES: Resource & Readonly<Record<Locale, Resource[Locale]>> = {
  en: {
    common: {
      language: 'Language',
      english: 'English',
      russian: 'Русский',
      uzbek: "O'zbek",
      back: 'Back',
      selected: 'Selected',
      menu: 'Menu',
      aiChat: 'AI chat',
      cart: 'Cart',
      searchCoursesPlaceholder: 'Search courses, topics, or instructors',
      footerCopyright: '(c) 2026 LearnHub',
      footerTagline: 'Accessible learning, built for every role.',
    },
    navigation: {
      languageMenu: 'Language menu',
      changeLanguage: 'Change language',
      currentLanguage: 'Current language: {{locale}}',
      openNavigation: 'Open navigation',
      catalog: 'Catalog',
      logIn: 'Log in',
      signUp: 'Sign up',
      myLearning: 'My learning',
      instructorCourses: 'Instructor courses',
    },
    auth: {
      logOut: 'Log out',
    },
    routes: {
      courseCatalogTitle: 'Course catalog',
      courseCatalogDescription: 'Browse and discover available courses.',
      courseDetailsTitle: 'Course details',
      courseDetailsDescription: 'Review course information and lessons.',
      createAccountTitle: 'Create account',
      createAccountDescription: 'Create a LearnHub account to start learning or teaching.',
      loginDescription: 'Access your learning or instructor workspace.',
      forgotPasswordTitle: 'Forgot password',
      forgotPasswordDescription: 'Request help signing back in to your account.',
      resetPasswordTitle: 'Reset password',
      resetPasswordDescription: 'Choose a new password for your account.',
      cartDescription: 'Your selected courses will appear here.',
      myLearningDescription: 'Your course enrollments will appear here.',
      learningDetailsTitle: 'Learning details',
      learningDetailsDescription: 'Course progress and lessons will appear here.',
      courseAssistantTitle: 'Course assistant',
      courseAssistantDescription: 'Ask questions about an active course.',
      aiAssistantTitle: 'AI assistant',
      aiAssistantDescription: 'Ask general learning questions.',
      instructorCoursesDescription: 'Your authored courses will appear here.',
      editCourseTitle: 'Edit course',
      editCourseDescription: 'Course and lesson editing will appear here.',
      courseEnrollmentsTitle: 'Course enrollments',
      courseEnrollmentsDescription: 'The selected course roster will appear here.',
      editLessonTitle: 'Edit lesson',
      editLessonDescription: 'Lesson metadata and upload tools will appear here.',
      renderErrorDocumentTitle: 'Something went wrong | LearnHub',
      bootstrapDocumentTitle: 'Preparing your workspace | LearnHub',
      sessionErrorDocumentTitle: 'Session check failed | LearnHub',
      pageDocumentTitle: '{{pageTitle}} | LearnHub',
      notFoundDocumentTitle: 'Page not found | LearnHub',
      bootstrapHeading: 'Preparing your workspace',
      bootstrapDescription: 'We are verifying your session.',
      bootstrapLoadingLabel: 'Loading application',
      sessionErrorHeading: 'Session check failed',
      tryAgain: 'Try again',
      renderErrorHeading: 'Something went wrong',
      renderErrorDescription: 'We could not display this page. Try again or return to the catalog.',
      forbiddenHeading: 'You do not have access to this page',
      forbiddenDescription: 'Use an account with the required role, or return to the catalog.',
      notFoundHeading: 'Page not found',
      notFoundDescription: 'The address may be incorrect, or the page may have moved.',
      sessionErrorNoticeTitle: 'Unable to start the application',
      sessionErrorNoticeDescription:
        'We could not verify your session. Check your connection and try again.',
      backToCatalog: 'Back to catalog',
    },
    a11y: {
      localeOption: '{{language}} language',
      localeOptionSelected: '{{language}} language, selected',
      accountMenu: 'Account menu for {{identity}}',
      accountDetails: 'Account details for {{identity}}',
      cart: 'Cart ({{cartCount}})',
      accountNavigation: 'Account navigation',
      openAiAssistant: 'Open AI assistant',
      primaryNavigation: 'Primary navigation',
      courseCatalogSearch: 'Course catalog search',
      searchCourses: 'Search courses',
      recentSearches: 'Recent searches',
      closeNavigation: 'Close navigation',
      openNavigation: 'Open navigation',
      mobileNavigation: 'Mobile navigation',
      studentNavigation: 'Student navigation',
      anonymousNavigation: 'Anonymous navigation',
      skipToMainContent: 'Skip to main content',
      learnHubHome: 'LearnHub home',
    },
  },
  ru: {
    common: {
      language: 'Язык',
      english: 'English',
      russian: 'Русский',
      uzbek: "O'zbek",
      back: 'Назад',
      selected: 'Выбрано',
      menu: 'Меню',
      aiChat: 'Чат с ИИ',
      cart: 'Корзина',
      searchCoursesPlaceholder: 'Поиск курсов, тем или преподавателей',
      footerCopyright: '© 2026 LearnHub',
      footerTagline: 'Доступное обучение для каждой роли.',
    },
    navigation: {
      languageMenu: 'Меню языка',
      changeLanguage: 'Изменить язык',
      currentLanguage: 'Текущий язык: {{locale}}',
      openNavigation: 'Открыть навигацию',
      catalog: 'Каталог',
      logIn: 'Войти',
      signUp: 'Регистрация',
      myLearning: 'Моё обучение',
      instructorCourses: 'Курсы преподавателя',
    },
    auth: {
      logOut: 'Выйти',
    },
    routes: {
      courseCatalogTitle: 'Каталог курсов',
      courseCatalogDescription: 'Просматривайте и находите доступные курсы.',
      courseDetailsTitle: 'Сведения о курсе',
      courseDetailsDescription: 'Просмотрите информацию о курсе и уроках.',
      createAccountTitle: 'Создать аккаунт',
      createAccountDescription: 'Создайте аккаунт LearnHub, чтобы учиться или преподавать.',
      loginDescription: 'Перейдите в пространство обучения или преподавателя.',
      forgotPasswordTitle: 'Забыли пароль',
      forgotPasswordDescription: 'Запросите помощь, чтобы снова войти в аккаунт.',
      resetPasswordTitle: 'Сбросить пароль',
      resetPasswordDescription: 'Выберите новый пароль для аккаунта.',
      cartDescription: 'Здесь появятся выбранные вами курсы.',
      myLearningDescription: 'Здесь появятся курсы, на которые вы записаны.',
      learningDetailsTitle: 'Сведения об обучении',
      learningDetailsDescription: 'Здесь появятся прогресс курса и уроки.',
      courseAssistantTitle: 'Ассистент курса',
      courseAssistantDescription: 'Задавайте вопросы по активному курсу.',
      aiAssistantTitle: 'ИИ-ассистент',
      aiAssistantDescription: 'Задавайте общие вопросы об обучении.',
      instructorCoursesDescription: 'Здесь появятся созданные вами курсы.',
      editCourseTitle: 'Редактировать курс',
      editCourseDescription: 'Здесь появятся инструменты редактирования курса и уроков.',
      courseEnrollmentsTitle: 'Записи на курс',
      courseEnrollmentsDescription: 'Здесь появится список участников выбранного курса.',
      editLessonTitle: 'Редактировать урок',
      editLessonDescription: 'Здесь появятся данные урока и инструменты загрузки.',
      renderErrorDocumentTitle: 'Что-то пошло не так | LearnHub',
      bootstrapDocumentTitle: 'Подготавливаем рабочее пространство | LearnHub',
      sessionErrorDocumentTitle: 'Не удалось проверить сеанс | LearnHub',
      pageDocumentTitle: '{{pageTitle}} | LearnHub',
      notFoundDocumentTitle: 'Страница не найдена | LearnHub',
      bootstrapHeading: 'Подготавливаем рабочее пространство',
      bootstrapDescription: 'Проверяем ваш сеанс.',
      bootstrapLoadingLabel: 'Загрузка приложения',
      sessionErrorHeading: 'Не удалось проверить сеанс',
      tryAgain: 'Повторить',
      renderErrorHeading: 'Что-то пошло не так',
      renderErrorDescription:
        'Не удалось отобразить страницу. Повторите попытку или вернитесь в каталог.',
      forbiddenHeading: 'У вас нет доступа к этой странице',
      forbiddenDescription: 'Войдите с аккаунтом нужной роли или вернитесь в каталог.',
      notFoundHeading: 'Страница не найдена',
      notFoundDescription: 'Возможно, адрес указан неверно или страница была перемещена.',
      sessionErrorNoticeTitle: 'Не удалось запустить приложение',
      sessionErrorNoticeDescription:
        'Не удалось проверить сеанс. Проверьте подключение и повторите попытку.',
      backToCatalog: 'Вернуться в каталог',
    },
    a11y: {
      localeOption: 'Язык {{language}}',
      localeOptionSelected: 'Язык {{language}}, выбран',
      accountMenu: 'Меню аккаунта: {{identity}}',
      accountDetails: 'Данные аккаунта: {{identity}}',
      cart: 'Корзина ({{cartCount}})',
      accountNavigation: 'Навигация по аккаунту',
      openAiAssistant: 'Открыть ИИ-ассистента',
      primaryNavigation: 'Основная навигация',
      courseCatalogSearch: 'Поиск по каталогу курсов',
      searchCourses: 'Искать курсы',
      recentSearches: 'Недавние поисковые запросы',
      closeNavigation: 'Закрыть навигацию',
      openNavigation: 'Открыть навигацию',
      mobileNavigation: 'Мобильная навигация',
      studentNavigation: 'Навигация студента',
      anonymousNavigation: 'Навигация гостя',
      skipToMainContent: 'Перейти к основному содержимому',
      learnHubHome: 'Главная LearnHub',
    },
  },
  uz: {
    common: {
      language: 'Til',
      english: 'English',
      russian: 'Русский',
      uzbek: "O'zbek",
      back: 'Ortga',
      selected: 'Tanlangan',
      menu: 'Menyu',
      aiChat: 'AI chat',
      cart: 'Savat',
      searchCoursesPlaceholder: 'Kurslar, mavzular yoki o‘qituvchilarni qidiring',
      footerCopyright: '© 2026 LearnHub',
      footerTagline: 'Har bir rol uchun qulay ta’lim.',
    },
    navigation: {
      languageMenu: 'Til menyusi',
      changeLanguage: 'Tilni o‘zgartirish',
      currentLanguage: 'Joriy til: {{locale}}',
      openNavigation: 'Navigatsiyani ochish',
      catalog: 'Katalog',
      logIn: 'Kirish',
      signUp: 'Ro‘yxatdan o‘tish',
      myLearning: 'Ta’limim',
      instructorCourses: 'O‘qituvchi kurslari',
    },
    auth: {
      logOut: 'Chiqish',
    },
    routes: {
      courseCatalogTitle: 'Kurslar katalogi',
      courseCatalogDescription: 'Mavjud kurslarni ko‘ring va toping.',
      courseDetailsTitle: 'Kurs tafsilotlari',
      courseDetailsDescription: 'Kurs va darslar haqidagi ma’lumotlarni ko‘ring.',
      createAccountTitle: 'Akkaunt yaratish',
      createAccountDescription:
        'O‘qish yoki dars berishni boshlash uchun LearnHub akkauntini yarating.',
      loginDescription: 'Ta’lim yoki o‘qituvchi ish maydoniga kiring.',
      forgotPasswordTitle: 'Parolni unutdingizmi',
      forgotPasswordDescription: 'Akkauntingizga qayta kirish uchun yordam so‘rang.',
      resetPasswordTitle: 'Parolni tiklash',
      resetPasswordDescription: 'Akkauntingiz uchun yangi parol tanlang.',
      cartDescription: 'Siz tanlagan kurslar shu yerda ko‘rsatiladi.',
      myLearningDescription: 'Siz yozilgan kurslar shu yerda ko‘rsatiladi.',
      learningDetailsTitle: 'Ta’lim tafsilotlari',
      learningDetailsDescription: 'Kurs jarayoni va darslar shu yerda ko‘rsatiladi.',
      courseAssistantTitle: 'Kurs yordamchisi',
      courseAssistantDescription: 'Faol kurs haqida savollar bering.',
      aiAssistantTitle: 'AI yordamchi',
      aiAssistantDescription: 'Ta’lim bo‘yicha umumiy savollar bering.',
      instructorCoursesDescription: 'Siz yaratgan kurslar shu yerda ko‘rsatiladi.',
      editCourseTitle: 'Kursni tahrirlash',
      editCourseDescription: 'Kurs va darslarni tahrirlash vositalari shu yerda ko‘rsatiladi.',
      courseEnrollmentsTitle: 'Kursga yozilishlar',
      courseEnrollmentsDescription: 'Tanlangan kurs qatnashchilari shu yerda ko‘rsatiladi.',
      editLessonTitle: 'Darsni tahrirlash',
      editLessonDescription: 'Dars ma’lumotlari va yuklash vositalari shu yerda ko‘rsatiladi.',
      renderErrorDocumentTitle: 'Nimadir xato ketdi | LearnHub',
      bootstrapDocumentTitle: 'Ish maydoni tayyorlanmoqda | LearnHub',
      sessionErrorDocumentTitle: 'Seansni tekshirib bo‘lmadi | LearnHub',
      pageDocumentTitle: '{{pageTitle}} | LearnHub',
      notFoundDocumentTitle: 'Sahifa topilmadi | LearnHub',
      bootstrapHeading: 'Ish maydoni tayyorlanmoqda',
      bootstrapDescription: 'Seansingiz tekshirilmoqda.',
      bootstrapLoadingLabel: 'Ilova yuklanmoqda',
      sessionErrorHeading: 'Seansni tekshirib bo‘lmadi',
      tryAgain: 'Qayta urinish',
      renderErrorHeading: 'Nimadir xato ketdi',
      renderErrorDescription:
        'Bu sahifani ko‘rsatib bo‘lmadi. Qayta urinib ko‘ring yoki katalogga qayting.',
      forbiddenHeading: 'Bu sahifaga kirish huquqingiz yo‘q',
      forbiddenDescription: 'Kerakli rolga ega akkauntdan foydalaning yoki katalogga qayting.',
      notFoundHeading: 'Sahifa topilmadi',
      notFoundDescription: 'Manzil noto‘g‘ri bo‘lishi yoki sahifa ko‘chirilgan bo‘lishi mumkin.',
      sessionErrorNoticeTitle: 'Ilovani ishga tushirib bo‘lmadi',
      sessionErrorNoticeDescription:
        'Seansni tekshirib bo‘lmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.',
      backToCatalog: 'Katalogga qaytish',
    },
    a11y: {
      localeOption: '{{language}} tili',
      localeOptionSelected: '{{language}} tili, tanlangan',
      accountMenu: '{{identity}} uchun akkaunt menyusi',
      accountDetails: '{{identity}} akkaunti ma’lumotlari',
      cart: 'Savat ({{cartCount}})',
      accountNavigation: 'Akkaunt navigatsiyasi',
      openAiAssistant: 'AI yordamchini ochish',
      primaryNavigation: 'Asosiy navigatsiya',
      courseCatalogSearch: 'Kurslar katalogidan qidirish',
      searchCourses: 'Kurslarni qidirish',
      recentSearches: 'So‘nggi qidiruvlar',
      closeNavigation: 'Navigatsiyani yopish',
      openNavigation: 'Navigatsiyani ochish',
      mobileNavigation: 'Mobil navigatsiya',
      studentNavigation: 'Talaba navigatsiyasi',
      anonymousNavigation: 'Mehmon navigatsiyasi',
      skipToMainContent: "Asosiy mazmunga o'tish",
      learnHubHome: 'LearnHub bosh sahifasi',
    },
  },
};

const MLUX_004_PLURAL_FORMS = {
  'MLUX-C0401': {
    en: {
      one: '{{count}} lesson available',
      other: '{{count}} lessons available',
    },
    ru: {
      one: '{{count}} доступный урок',
      few: '{{count}} доступных урока',
      many: '{{count}} доступных уроков',
      other: '{{count}} доступного урока',
    },
    uz: {
      one: '{{count}} ta dars mavjud',
      other: '{{count}} ta dars mavjud',
    },
  },
  'MLUX-C0441': {
    en: {
      one: '{{count}} course',
      other: '{{count}} courses',
    },
    ru: {
      one: '{{count}} курс',
      few: '{{count}} курса',
      many: '{{count}} курсов',
      other: '{{count}} курса',
    },
    uz: {
      one: '{{count}} ta kurs',
      other: '{{count}} ta kurs',
    },
  },
  'MLUX-C0446': {
    en: {
      one: 'lesson',
      other: 'lessons',
    },
    ru: {
      one: 'урок',
      few: 'урока',
      many: 'уроков',
      other: 'урока',
    },
    uz: {
      one: 'dars',
      other: 'dars',
    },
  },
} as const;

const MLUX_005_PLURAL_FORMS = {
  'MLUX-C0448': {
    en: {
      one: '{{count}} enrollment',
      other: '{{count}} enrollments',
    },
    ru: {
      one: '{{count}} запись',
      few: '{{count}} записи',
      many: '{{count}} записей',
      other: '{{count}} записи',
    },
    uz: {
      one: '{{count}} ta yozilish',
      other: '{{count}} ta yozilish',
    },
  },
} as const;

function withMlux004Resources(locale: Locale): Resource[Locale] {
  const resources = Object.fromEntries(
    Object.entries(BASE_LOCALE_RESOURCES[locale]).map(([namespace, values]) => [
      namespace,
      { ...(values as Record<string, string>) },
    ]),
  ) as Record<string, Record<string, string>>;

  MLUX_004_RUNTIME_MAPPING.forEach(({ unitId, namespace, key, plural }, index) => {
    const translation = MLUX_004_TRANSLATIONS[index];
    if (!translation) return;
    const namespaceResources = (resources[namespace] ??= {});
    const pluralForms = MLUX_004_PLURAL_FORMS[unitId as keyof typeof MLUX_004_PLURAL_FORMS];
    if (plural && pluralForms) {
      Object.entries(pluralForms[locale]).forEach(([suffix, value]) => {
        namespaceResources[`${key}_${suffix}`] = value;
      });
      return;
    }
    namespaceResources[key] = translation[locale];
  });
  MLUX_005_RUNTIME_MAPPING.forEach(({ unitId, namespace, key, plural }, index) => {
    const translation = MLUX_005_TRANSLATIONS[index];
    if (!translation) return;
    const namespaceResources = (resources[namespace] ??= {});
    const pluralForms = MLUX_005_PLURAL_FORMS[unitId as keyof typeof MLUX_005_PLURAL_FORMS];
    if (plural && pluralForms) {
      Object.entries(pluralForms[locale]).forEach(([suffix, value]) => {
        namespaceResources[`${key}_${suffix}`] = value;
      });
      return;
    }
    namespaceResources[key] = translation[locale];
  });
  MLUX_006_FOLLOWUP_RUNTIME_MAPPING.forEach(({ namespace, key }, index) => {
    const translation = MLUX_006_FOLLOWUP_TRANSLATIONS[index];
    if (!translation) return;
    const namespaceResources = (resources[namespace] ??= {});
    namespaceResources[key] = translation[locale];
  });

  return resources;
}

export const LOCALE_RESOURCES: Resource & Readonly<Record<Locale, Resource[Locale]>> = {
  en: withMlux004Resources('en'),
  ru: withMlux004Resources('ru'),
  uz: withMlux004Resources('uz'),
};
