import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useSession } from '@features/auth-session';

import type {
  CartCompositeOutcomeSelection,
  CartCompositeSnapshotInput,
} from './cart-composite-state';
import {
  useCartCompositeCheckout,
  type CartCompositeCheckoutPhase,
  type CartCompositeCheckoutStartOptions,
  type CartCompositeCheckoutWorkflow,
} from './use-cart-composite-checkout';

const simulatedFailureDelayMs = 7_000;

interface CartCompositeCheckoutRequest {
  readonly courses: readonly CartCompositeSnapshotInput[];
  readonly selections: readonly CartCompositeOutcomeSelection[];
  readonly options: CartCompositeCheckoutStartOptions;
}

interface RouteStableCartCompositeCheckoutContextValue {
  readonly workflow: CartCompositeCheckoutWorkflow;
  synchronizeCourses(courses: readonly CartCompositeSnapshotInput[]): void;
  start(
    courses: readonly CartCompositeSnapshotInput[],
    selections?: readonly CartCompositeOutcomeSelection[],
  ): void;
  simulateFailure(
    courses: readonly CartCompositeSnapshotInput[],
    selections: readonly CartCompositeOutcomeSelection[],
  ): void;
}

export interface RouteStableCartCompositeCheckoutWorkflow extends CartCompositeCheckoutWorkflow {
  simulateFailure(selections: readonly CartCompositeOutcomeSelection[]): void;
}

export interface CartCompositeCheckoutProviderProps {
  readonly children: ReactNode;
}

const CartCompositeCheckoutContext =
  createContext<RouteStableCartCompositeCheckoutContextValue | null>(null);

function sameCourses(
  current: readonly CartCompositeSnapshotInput[],
  next: readonly CartCompositeSnapshotInput[],
): boolean {
  return (
    current.length === next.length &&
    current.every(
      (course, index) =>
        course.courseId === next[index]?.courseId && course.price === next[index]?.price,
    )
  );
}

function canStartNewCheckout(phase: CartCompositeCheckoutPhase): boolean {
  return phase === 'idle' || phase === 'recovery_empty' || phase === 'checkout_completed';
}

export function CartCompositeCheckoutProvider({ children }: CartCompositeCheckoutProviderProps) {
  const session = useSession();
  const [courses, setCourses] = useState<readonly CartCompositeSnapshotInput[]>([]);
  const [request, setRequest] = useState<CartCompositeCheckoutRequest | null>(null);
  const workflow = useCartCompositeCheckout(courses);
  const requestQueuedRef = useRef(false);

  useEffect(() => {
    requestQueuedRef.current = false;
    setRequest(null);
    setCourses([]);
  }, [session.cacheEpoch]);

  useEffect(() => {
    if (request === null || !canStartNewCheckout(workflow.phase)) return;
    requestQueuedRef.current = false;
    setRequest(null);
    workflow.start(request.selections, request.options);
  }, [request, workflow]);

  const value = useMemo<RouteStableCartCompositeCheckoutContextValue>(
    () => ({
      workflow,
      synchronizeCourses(nextCourses) {
        if (requestQueuedRef.current || workflow.pending) return;
        setCourses((current) => (sameCourses(current, nextCourses) ? current : nextCourses));
      },
      start(nextCourses, selections = []) {
        if (requestQueuedRef.current || !canStartNewCheckout(workflow.phase)) return;
        requestQueuedRef.current = true;
        setCourses(nextCourses);
        setRequest({ courses: nextCourses, selections, options: {} });
      },
      simulateFailure(nextCourses, selections) {
        if (requestQueuedRef.current || !canStartNewCheckout(workflow.phase)) return;
        requestQueuedRef.current = true;
        setCourses(nextCourses);
        setRequest({
          courses: nextCourses,
          selections,
          options: { completionDelayMs: simulatedFailureDelayMs },
        });
      },
    }),
    [workflow],
  );

  return (
    <CartCompositeCheckoutContext.Provider value={value}>
      {children}
    </CartCompositeCheckoutContext.Provider>
  );
}

export function useRouteStableCartCompositeCheckout(
  courses: readonly CartCompositeSnapshotInput[],
): RouteStableCartCompositeCheckoutWorkflow {
  const context = useContext(CartCompositeCheckoutContext);
  useEffect(() => {
    context?.synchronizeCourses(courses);
  }, [context, courses]);
  if (context === null)
    throw new Error(
      'useRouteStableCartCompositeCheckout must be used within CartCompositeCheckoutProvider',
    );
  return useMemo(
    () => ({
      ...context.workflow,
      start: (selections = []) => context.start(courses, selections),
      simulateFailure: (selections) => context.simulateFailure(courses, selections),
    }),
    [context, courses],
  );
}
