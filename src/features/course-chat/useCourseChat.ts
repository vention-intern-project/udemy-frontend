import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useSession } from '@features/auth-session';
import { ApiError } from '@shared/api';

import { requestCourseChat } from './api';
import type { ChatMessage, CourseChatContext, CourseChatErrorState } from './model';
import { isCourseChatPreviewEnabled, previewCourseChat, previewMessages } from './preview';

function errorState(error: unknown): CourseChatErrorState | null {
  if (error instanceof ApiError) {
    if (error.kind === 'aborted') return null;
    if (error.status === 401) return 'sign_in_required';
    if (error.status === 422) return 'invalid_request';
    if (error.status === 500) return 'response_failed';
    if (error.status === 503 || error.kind === 'offline') return 'temporarily_unavailable';
  }
  return 'unavailable';
}

function newThreadId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function chatContextKey(context: CourseChatContext): string {
  if (context.kind === 'general') return 'general';
  return `course:${context.courseId}:${context.lessonId ?? ''}`;
}

export interface CourseChatWorkflow {
  readonly draft: string;
  readonly messages: readonly ChatMessage[];
  readonly pending: boolean;
  readonly error: CourseChatErrorState | null;
  setDraft(value: string): void;
  submit(): void;
  reset(): void;
}

interface StoredCourseChatSession {
  readonly draft: string;
  readonly error: CourseChatErrorState | null;
  readonly messages: readonly ChatMessage[];
  readonly pending: boolean;
  readonly threadId: string;
}

type CourseChatSessionMap = Readonly<Record<string, StoredCourseChatSession>>;

interface CourseChatSessionContextValue {
  workflowFor(context: CourseChatContext): CourseChatWorkflow;
  resetConversation(context: CourseChatContext): void;
}

interface CourseChatSessionProviderProps {
  readonly children: ReactNode;
}

const CourseChatSessionContext = createContext<CourseChatSessionContextValue | null>(null);

function emptySession(): StoredCourseChatSession {
  return {
    draft: '',
    error: null,
    messages: [],
    pending: false,
    threadId: newThreadId(),
  };
}

function initialSession(context: CourseChatContext): StoredCourseChatSession {
  const session = emptySession();
  return { ...session, messages: previewMessages(context, session.threadId) };
}

export function CourseChatSessionProvider({ children }: CourseChatSessionProviderProps) {
  const session = useSession();
  const [sessions, setSessions] = useState<CourseChatSessionMap>({});
  const sessionsRef = useRef<CourseChatSessionMap>({});
  const controllersRef = useRef(new Map<string, AbortController>());

  const replaceSessions = (next: CourseChatSessionMap) => {
    sessionsRef.current = next;
    setSessions(next);
  };

  const resetConversation = (context: CourseChatContext) => {
    const key = chatContextKey(context);
    controllersRef.current.get(key)?.abort();
    controllersRef.current.delete(key);
    replaceSessions({ ...sessionsRef.current, [key]: emptySession() });
  };

  useEffect(
    () => () => {
      controllersRef.current.forEach((controller) => controller.abort());
      controllersRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current.clear();
    sessionsRef.current = {};
    setSessions({});
  }, [session.cacheEpoch, session.state.status]);

  const workflowFor = (context: CourseChatContext): CourseChatWorkflow => {
    const key = chatContextKey(context);
    const snapshot = sessions[key] ?? initialSession(context);
    const setDraft = (draft: string) => {
      const current = sessionsRef.current[key] ?? initialSession(context);
      replaceSessions({ ...sessionsRef.current, [key]: { ...current, draft } });
    };
    const submit = () => {
      const current = sessionsRef.current[key] ?? initialSession(context);
      const message = current.draft.trim();
      if (message === '' || current.pending) return;

      const controller = new AbortController();
      const learnerMessage: ChatMessage = {
        id: `${current.threadId}:learner:${Date.now()}`,
        author: 'learner',
        text: message,
      };
      const next: StoredCourseChatSession = {
        ...current,
        draft: '',
        error: null,
        messages: [...current.messages, learnerMessage],
        pending: true,
      };
      controllersRef.current.get(key)?.abort();
      controllersRef.current.set(key, controller);
      replaceSessions({ ...sessionsRef.current, [key]: next });

      const response = isCourseChatPreviewEnabled
        ? previewCourseChat(current.threadId, message)
        : requestCourseChat(session, current.threadId, message, context, controller.signal);
      void response
        .then((response) => {
          if (controllersRef.current.get(key) !== controller) return;
          const active = sessionsRef.current[key];
          if (active === undefined) return;
          replaceSessions({
            ...sessionsRef.current,
            [key]: {
              ...active,
              messages: [
                ...active.messages,
                {
                  id: `${response.thread_id}:assistant:${Date.now()}`,
                  author: 'assistant',
                  text: response.response,
                },
              ],
              threadId: response.thread_id,
            },
          });
        })
        .catch((reason: unknown) => {
          if (controllersRef.current.get(key) !== controller) return;
          const active = sessionsRef.current[key];
          if (active === undefined) return;
          replaceSessions({
            ...sessionsRef.current,
            [key]: { ...active, error: errorState(reason) },
          });
        })
        .finally(() => {
          if (controllersRef.current.get(key) !== controller) return;
          controllersRef.current.delete(key);
          const active = sessionsRef.current[key];
          if (active === undefined) return;
          replaceSessions({ ...sessionsRef.current, [key]: { ...active, pending: false } });
        });
    };
    return {
      draft: snapshot.draft,
      messages: snapshot.messages,
      pending: snapshot.pending,
      error: snapshot.error,
      setDraft,
      submit,
      reset: () => resetConversation(context),
    };
  };

  return createElement(
    CourseChatSessionContext.Provider,
    { value: { workflowFor, resetConversation } },
    children,
  );
}

function useLocalCourseChat(context: CourseChatContext): CourseChatWorkflow {
  const session = useSession();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<CourseChatErrorState | null>(null);
  const threadId = useRef(newThreadId());
  const mounted = useRef(true);
  const activeController = useRef<AbortController | null>(null);

  const reset = () => {
    activeController.current?.abort();
    activeController.current = null;
    threadId.current = newThreadId();
    setDraft('');
    setMessages([]);
    setPending(false);
    setError(null);
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeController.current?.abort();
      activeController.current = null;
    };
  }, []);

  const submit = () => {
    const message = draft.trim();
    if (message === '' || pending) return;
    setPending(true);
    setError(null);
    setDraft('');
    const learnerMessage: ChatMessage = {
      id: `${threadId.current}:learner:${Date.now()}`,
      author: 'learner',
      text: message,
    };
    setMessages((current) => [...current, learnerMessage]);
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    void requestCourseChat(session, threadId.current, message, context, controller.signal)
      .then((response) => {
        if (!mounted.current) return;
        threadId.current = response.thread_id;
        setMessages((current) => [
          ...current,
          {
            id: `${response.thread_id}:assistant:${Date.now()}`,
            author: 'assistant',
            text: response.response,
          },
        ]);
      })
      .catch((reason: unknown) => {
        if (!mounted.current) return;
        setError(errorState(reason));
      })
      .finally(() => {
        if (activeController.current === controller) activeController.current = null;
        if (mounted.current) setPending(false);
      });
  };
  return { draft, messages, pending, error, setDraft, submit, reset };
}

export function useCourseChat(context: CourseChatContext): CourseChatWorkflow {
  const shared = useContext(CourseChatSessionContext);
  const local = useLocalCourseChat(context);
  return shared === null ? local : shared.workflowFor(context);
}

export function useCourseChatSessionControls() {
  const shared = useContext(CourseChatSessionContext);
  return {
    resetConversation: shared?.resetConversation ?? (() => undefined),
  };
}
