import type { ScheduleConfig } from "./schedule";

export type RuleID = string;

/**
 * Rule configuration for site overrides
 * Defines how rules behave for a specific domain
 */
export interface RuleConfig {
  enabled?: boolean; // If false, all rules disabled for this site
  rules?: RuleID[]; // Specific rules to enable/disable for this site
}

export interface UserSettings {
  schedule: ScheduleConfig;
  enabledRules: RuleID[];
  siteOverrides: Record<string, RuleConfig>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  schedule: {
    type: "fixed",
    sleepStart: "22:00",
    sleepEnd: "07:00",
  },
  enabledRules: [], // Empty array means all rules are enabled by default
  siteOverrides: {},
};
