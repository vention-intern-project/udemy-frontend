const focusableSelector = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function isUnavailableByTree(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;

  while (current) {
    if (
      current.hidden
      || current.getAttribute('aria-hidden')?.toLowerCase() === 'true'
      || current.hasAttribute('inert')
    ) {
      return true;
    }

    const style = window.getComputedStyle(current);
    if (
      style.display === 'none'
      || style.visibility === 'hidden'
      || style.visibility === 'collapse'
      || style.getPropertyValue('content-visibility') === 'hidden'
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

function isTabbableRadio(element: HTMLElement): boolean {
  if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) {
    return true;
  }

  const group = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
    .filter((radio) => (
      radio.name === element.name
      && radio.form === element.form
      && radio.getRootNode() === element.getRootNode()
      && !radio.matches(':disabled')
      && !isUnavailableByTree(radio)
    ));
  const checked = group.find((radio) => radio.checked);

  return checked ? checked === element : group[0] === element;
}

export function isTabbableElement(
  element: HTMLElement,
  layoutRoot: HTMLElement = document.documentElement,
): boolean {
  if (
    !element.isConnected
    || element.tabIndex < 0
    || element.matches(':disabled')
    || isUnavailableByTree(element)
    || !isTabbableRadio(element)
  ) {
    return false;
  }

  // JSDOM does not implement layout and returns no client rects for every node.
  // In a rendering browser, a missing box identifies elements hidden by layout
  // mechanisms such as a closed details element or a clipped-away display tree.
  if (layoutRoot.getClientRects().length > 0 && element.getClientRects().length === 0) {
    return false;
  }

  return true;
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => isTabbableElement(element, container));
}

export function focusFirst(container: HTMLElement): HTMLElement {
  const target = getFocusableElements(container)[0] ?? container;
  target.focus();
  return target;
}
