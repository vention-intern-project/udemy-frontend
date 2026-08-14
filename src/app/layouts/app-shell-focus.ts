export function scheduleAppShellFocus(focus: () => void): void {
  if (typeof globalThis.requestAnimationFrame === 'function')
    globalThis.requestAnimationFrame(focus);
  else globalThis.setTimeout(focus, 0);
}

export function focusInstructorCourseTitle(titleId: string): void {
  const titleTarget = document.getElementById(titleId);
  if (!(titleTarget instanceof HTMLInputElement)) return;
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  titleTarget.scrollIntoView({ behavior, block: 'center' });
  titleTarget.focus({ preventScroll: true });
}
