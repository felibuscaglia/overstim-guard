import type { Rule, RuleContext } from "@/types/rule";
import { BaseRule } from "./base-rule";

/**
 * InfiniteScrollBlockRule — Breaks compulsive feed consumption loops
 *
 * Detects infinite scroll containers and freezes them after a threshold
 */
export class InfiniteScrollBlockRule extends BaseRule implements Rule {
  readonly id = "infinite-scroll-block";

  private scrollContainers: Map<
    Element,
    {
      originalHeight: string;
      originalOverflow: string;
      threshold: number;
      showMoreButton: HTMLElement | null;
    }
  > = new Map();

  private mutationObserver: MutationObserver | null = null;
  private readonly SCROLL_THRESHOLD_MULTIPLIER = 2.5;

  override applies(context: RuleContext): boolean {
    return context.calmModeActive;
  }

  override apply(context: RuleContext): void {
    if (this.mutationObserver !== null) return;
  }

  private detectScrollContainers(): void {
    // Common selectors for infinite scroll containers
    const selectors = [
      '[role="feed"]',
      '[role="article"]',
      "main",
      '[class*="feed"]',
      '[class*="stream"]',
      '[class*="timeline"]',
      '[id*="feed"]',
      '[id*="stream"]',
    ];

    const candidates: Element[] = [];

    selectors.forEach((selector) => {
      try {
        candidates.push(...Array.from(document.querySelectorAll(selector)));
      } catch {
        // Skip
      }
    });

    const viewportHeight = window.innerHeight;
    const threshold = viewportHeight * this.SCROLL_THRESHOLD_MULTIPLIER;

    candidates.forEach((container) => {
      if (this.scrollContainers.has(container)) return;

      const rect = container.getBoundingClientRect();
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Check if this looks like an infinite scroll container
      if (
        scrollHeight > threshold &&
        clientHeight > viewportHeight * 0.5 &&
        (container.scrollTop > 0 || scrollHeight > clientHeight * 1.5)
      ) {
        this.freezeScrollContainer(container, threshold);
      }
    });
  }

  private freezeScrollContainer(container: Element, threshold: number): void {
    const htmlElement = container as HTMLElement;
    const originalHeight = htmlElement.style.height || "";
    const originalOverflow = htmlElement.style.overflow || "";

    // Freeze the container height
    htmlElement.style.height = `${threshold}px`;
    htmlElement.style.overflow = "hidden";
    htmlElement.style.position = "relative";

    // Create "Show more" button
    const showMoreButton = document.createElement("button");
    showMoreButton.textContent = "Show more content";
    showMoreButton.style.cssText = `
      position: sticky;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    showMoreButton.addEventListener("click", () => {
      // Temporarily restore scroll
      htmlElement.style.height = "";
      htmlElement.style.overflow = originalOverflow || "";

      // Scroll down a bit
      const viewportHeight = window.innerHeight;
      container.scrollTop += viewportHeight;

      setTimeout(() => {
        this.freezeScrollContainer(container, threshold);
      }, 100);
    });

    container.appendChild(showMoreButton);

    this.scrollContainers.set(container, {
      originalHeight,
      originalOverflow,
      threshold,
      showMoreButton,
    });
  }

  override revert(): void {
    this.scrollContainers.forEach((state, container) => {
      const htmlElement = container as HTMLElement;
      htmlElement.style.height = state.originalHeight;
      htmlElement.style.overflow = state.originalOverflow;

      if (state.showMoreButton) {
        state.showMoreButton.remove();
      }
    });

    this.scrollContainers.clear();

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    super.revert();
  }
}
