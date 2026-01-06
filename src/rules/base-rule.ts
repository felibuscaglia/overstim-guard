import type { Rule, RuleContext } from "@/types/rule";
import type { DOMState } from "@/utils/dom";

// Base class for rules that handles state management
export abstract class BaseRule implements Rule {
  abstract readonly id: string;
  protected states: DOMState[] = [];
  protected styleElements: HTMLStyleElement[] = [];

  abstract applies(context: RuleContext): boolean;
  abstract apply(context: RuleContext): void;

  // Default revert implementation
  revert(): void {
    this.states = [];

    // Remove all injected styles
    this.styleElements.forEach((el) => el.remove());
    this.styleElements = [];
  }

  // Helper to track DOM state for automatic revert
  protected trackState(state: DOMState): void {
    this.states.push(state);
  }

  // Helper to track style elements for automatic revert
  protected trackStyle(style: HTMLStyleElement): void {
    this.styleElements.push(style);
  }
}
