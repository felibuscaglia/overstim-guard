import { Rule, RuleContext } from "./rule";

/**
 * Registry that manages all rules and their lifecycle
 */
export interface RuleRegistry {
  // Register a new rule
  register(rule: Rule): void;

  // Unregister a rule by ID
  unregister(ruleId: string): void;

  // Get all registered rules
  getAllRules(): Rule[];

  // Get a rule by ID
  getRule(ruleId: string): Rule | undefined;

  // Apply al applicable rules for the given context
  applyRules(context: RuleContext): void;

  // Revert all applied rules
  revertAll(): void;

  // Teardown all rules (cleanup)
  teardown(): void;

  // Reapply rules (for tab changes, etc.)
  reapply(context: RuleContext): void;
}
