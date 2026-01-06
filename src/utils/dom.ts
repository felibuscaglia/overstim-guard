// Stores original state for reversible DOM changes
export interface DOMState {
  element: Element;
  originalStyle?: string;
  originalAttributes?: Map<string, string | null>;
  originalClassList?: string[];
}

/**
 * Apply a style change reversibly
 * Returns state object for revert
 */
export function applyStyle(
  element: Element,
  styles: Partial<CSSStyleDeclaration>
): DOMState {
  const htmlElement = element as HTMLElement;
  const originalStyle = htmlElement.style.cssText;
  const state: DOMState = { element };

  state.originalStyle = originalStyle;

  Object.assign(htmlElement.style, styles);

  return state;
}

// Revert a style change
export function revertStyle(state: DOMState): void {
  const htmlElement = state.element as HTMLElement;

  if (state.originalStyle !== undefined) {
    htmlElement.style.cssText = state.originalStyle;
  }
}

//  Apply CSS class change reversible
export function applyClasses(
  element: Element,
  classesToAdd: string[],
  classesToRemove: string[] = []
): DOMState {
  const state: DOMState = { element };
  state.originalClassList = Array.from(element.classList);

  classesToRemove.forEach((cls) => element.classList.remove(cls));
  classesToAdd.forEach((cls) => element.classList.add(cls));

  return state;
}

// Revert class changes
export function revertClasses(state: DOMState): void {
  if (state.originalClassList) {
    const element = state.element;

    // Remove all current classes
    element.className = "";

    // Restore original classes
    state.originalClassList.forEach((cls) => element.classList.add(cls));
  }
}

/**
 * Inject a style tag reversibly
 * Returns the style element for removal
 */
export function injectStyle(css: string): HTMLStyleElement {
  const style = document.createElement("style");

  style.textContent = css;
  style.setAttribute("data-overstim-guard", "true");
  document.head.appendChild(style);

  return style;
}

// Remove an injected style tag
export function removeStyle(styleElement: HTMLStyleElement): void {
  styleElement.remove();
}
