import type { Rule, RuleContext } from "@/types/rule";
import type { RuleRegistry as IRuleRegistry } from "@/types/registry";

export class RuleRegistry implements IRuleRegistry {
  private rules: Map<string, Rule> = new Map();
  private appliedRules: Set<string> = new Set();

  // Register a new rule
  register(rule: Rule): void {
    if (this.rules.has(rule.id)) {
      console.warn(`Rule ${rule.id} is already registered. Overwriting.`);
    }

    this.rules.set(rule.id, rule);
  }

  // Unregister a rule by ID
  unregister(ruleId: string): void {
    const rule = this.rules.get(ruleId);

    if (rule) {
      // Revert before unregistering if it was applied
      if (this.appliedRules.has(ruleId)) {
        rule.revert();
        this.appliedRules.delete(ruleId);
      }

      this.rules.delete(ruleId);
    }
  }

  // Get all registerd rules
  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  // Get a rule by ID
  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Apply all applicable rules for the given context
   * Only applies rules that pass the `applies()` check
   */
  applyRules(context: RuleContext): void {
    for (const rule of this.rules.values()) {
      // Check if rule should apply
      if (!rule.applies(context)) {
        // If rule was previously applied but no longer applies, revert it
        if (this.appliedRules.has(rule.id)) {
          rule.revert();
          this.appliedRules.delete(rule.id);
        }

        continue;
      }

      // Check site overrides
      if (context.siteOverrides?.enabled === false) continue;

      if (context.siteOverrides?.rules) {
        const ruleIds = context.siteOverrides.rules;
        const shouldApply = ruleIds.includes(rule.id);

        if (!shouldApply) {
          // Revert if previously applied
          if (this.appliedRules.has(rule.id)) {
            rule.revert();
            this.appliedRules.delete(rule.id);
          }

          continue;
        }
      }

      if (!this.appliedRules.has(rule.id)) {
        try {
          rule.apply(context);
          this.appliedRules.add(rule.id);
        } catch (error) {
          console.error(`Error applying rule ${rule.id}:`, error);
        }
      }
    }
  }

  // Revert all applied rules
  revertAll(): void {
    for (const ruleId of this.appliedRules) {
      const rule = this.rules.get(ruleId);

      if (rule) {
        try {
          rule.revert();
        } catch (error) {
          console.error(`Error reverting rule ${ruleId}:`, error);
        }
      }
    }

    this.appliedRules.clear();
  }

  /**
   * Teardown all rules (cleanup)
   * Called when content script is being removed/unloaded
   */
  teardown(): void {
    this.revertAll();
    this.rules.clear();
  }

  /**
   * Reapply rules (for tab changes, context updates, etc.)
   * Reverts all, then applies applicable rules for new context
   */
  reapply(context: RuleContext): void {
    this.revertAll();
    this.applyRules(context);
  }
}
