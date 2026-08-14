import type { MouseEvent } from 'react';
import { matchPath, type Location } from 'react-router-dom';

import type { SessionState } from '@features/auth-session';
import { parseCatalogQuery } from '@features/catalog-discovery';

import { APP_ROUTE_BY_ID } from '../router/route-registry';

export type NavigationItemVariant = 'browse-link' | 'login-secondary' | 'signup-primary';
export type NavigationItemDesktopGroup = 'auth-actions';

export interface NavigationItem {
  label: string;
  to: string;
  end?: boolean;
  desktopGroup?: NavigationItemDesktopGroup;
  primaryNavigationIndicator?: boolean;
  variant?: NavigationItemVariant;
}

export interface CartNavigationState {
  readonly returnTo: string;
}

export interface AssistantNavigationTarget {
  state: { returnTo: string } | undefined;
  to: string;
}

export function catalogPageForLocation(pathname: string, search: string): number | null {
  if (pathname !== APP_ROUTE_BY_ID['PAGE-001'].path) return null;
  return parseCatalogQuery(new URLSearchParams(search)).page;
}

export function navigationForSession(status: SessionState): NavigationItem[] {
  if (status.status !== 'authenticated') {
    return [
      {
        label: 'Catalog',
        to: '/',
        end: true,
        primaryNavigationIndicator: true,
        variant: 'browse-link',
      },
      {
        label: 'Log in',
        to: '/login',
        end: true,
        desktopGroup: 'auth-actions',
        variant: 'login-secondary',
      },
      {
        label: 'Sign up',
        to: '/signup',
        end: true,
        desktopGroup: 'auth-actions',
        variant: 'signup-primary',
      },
    ];
  }
  if (status.user.role === 'student') {
    return [
      {
        label: 'Catalog',
        to: '/',
        end: true,
        primaryNavigationIndicator: true,
        variant: 'browse-link',
      },
      { label: 'My learning', to: '/learning', end: true, primaryNavigationIndicator: true },
    ];
  }
  return status.user.role === 'instructor'
    ? [
        {
          label: 'Instructor courses',
          to: '/instructor/courses',
          end: true,
          primaryNavigationIndicator: true,
        },
      ]
    : [];
}

export function assistantNavigationTarget(location: Location): AssistantNavigationTarget {
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const enrollmentMatch = matchPath('/learning/enrollments/:enrollmentId/*', location.pathname);
  const to = enrollmentMatch?.params.enrollmentId
    ? `/learning/enrollments/${enrollmentMatch.params.enrollmentId}/ai-chat`
    : '/ai-chat';
  return { state: location.pathname === to ? undefined : { returnTo }, to };
}

export function cartNavigationState(location: Location): CartNavigationState {
  return { returnTo: `${location.pathname}${location.search}${location.hash}` };
}

export function isCurrentTabNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  const target = event.currentTarget.getAttribute('target');
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!target || target.toLowerCase() === '_self') &&
    !event.currentTarget.hasAttribute('download')
  );
}
