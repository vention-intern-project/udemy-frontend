import type { ChatResponseDto } from '@entities/api';

import type { ChatMessage, CourseChatContext } from './model';

const PREVIEW_DELAY_MS = 600;

export const isCourseChatPreviewEnabled =
  import.meta.env.DEV && import.meta.env.VITE_AI_CHAT_PREVIEW === 'true';

export function previewMessages(
  context: CourseChatContext,
  threadId: string,
): readonly ChatMessage[] {
  if (!isCourseChatPreviewEnabled || context.kind !== 'general') return [];
  return [
    {
      id: `${threadId}:preview:learner:1`,
      author: 'learner',
      text: 'Hi! I want to start learning programming. Can you recommend a beginner-friendly course on Python?',
    },
    {
      id: `${threadId}:preview:assistant:1`,
      author: 'assistant',
      text: "Welcome! Python is an excellent choice. I highly recommend starting with our bestseller: 'Complete Python Bootcamp: Go from Zero to Hero' by Dr. Angela Yu. It covers all core foundations with hands-on practice projects.",
    },
    {
      id: `${threadId}:preview:learner:2`,
      author: 'learner',
      text: 'Awesome, does that bootcamp cover web scraping or APIs as well?',
    },
    {
      id: `${threadId}:preview:assistant:2`,
      author: 'assistant',
      text: 'Yes! It has robust modules dedicated to scraping using BeautifulSoup and Selenium, as well as accessing REST APIs with requests. It is highly practical!',
    },
    {
      id: `${threadId}:preview:learner:3`,
      author: 'learner',
      text: 'How much time should I plan for each week if I am learning alongside a full-time job?',
    },
    {
      id: `${threadId}:preview:assistant:3`,
      author: 'assistant',
      text: 'A steady four to six hours per week is a practical starting point. Try one focused lesson on a weekday and a longer practice session at the weekend. Consistency matters more than finishing several modules in one sitting.',
    },
    {
      id: `${threadId}:preview:learner:4`,
      author: 'learner',
      text: 'Should I build a small project while taking the course, or wait until I finish it?',
    },
    {
      id: `${threadId}:preview:assistant:4`,
      author: 'assistant',
      text: 'Build something small as soon as you understand the basics. A command-line to-do list, a simple data tracker, or a tiny web scraper gives each lesson a concrete purpose and helps you remember the concepts.',
    },
    {
      id: `${threadId}:preview:learner:5`,
      author: 'learner',
      text: 'Thank you! Could you suggest a simple first project idea that uses both Python and an API?',
    },
    {
      id: `${threadId}:preview:assistant:5`,
      author: 'assistant',
      text: 'Try a personal weather dashboard. It can request a forecast from a public weather API, show the current conditions, and let you save a few favourite cities. Start with a terminal version, then add a small interface when you feel ready.',
    },
  ];
}

export function previewCourseChat(threadId: string, message: string): Promise<ChatResponseDto> {
  return new Promise((resolve) => {
    globalThis.setTimeout(() => {
      resolve({
        thread_id: threadId,
        response: `Preview reply: I received “${message}”. This local response is shown without contacting the AI service.`,
      });
    }, PREVIEW_DELAY_MS);
  });
}
