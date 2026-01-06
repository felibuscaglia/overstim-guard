/**
 * Context object passed to rules for decision-making
 */

export interface RuleContext {
  // Current page URL
  url: string;

  // Current page domain
  domain: string;

  // Current time (ISO string)
  currentTime: string;

  // Whether calm mode is active based on schedule
  calmModeActive: boolean;

  // Per-site overrides (if any)
  siteOverrides?: {
    enabled?: boolean;
    rules?: string[]; // Rule IDs to enable/disable
  };

  // Document object (for DOM access)
  document: Document;

  // Window object
  window: Window;
}

/**
 * Core Rule interface — All rules must implement this
 */
export interface Rule {
  // Unique identifier for the rule
  id: string;

  /**
   * Determines if this rule should apply in the diven context
   * Must be pure and side-effect free
   */
  applies(context: RuleContext): boolean;

  /**
   * Applies the rule's transformations
   * Must be idempotent
   * Must not permanently mutate DOM
   */
  apply(context: RuleContext): void;

  /**
   * Reverts all changes made by this rule
   * Must restore the page to its original state
   */
  revert(): void;
}
