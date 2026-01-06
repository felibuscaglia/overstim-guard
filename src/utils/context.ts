import { RuleContext } from "@/types/rule";

// Builds a RuleContext from the current page state
export function buildRuleContext(
  calmModeActive: boolean,
  siteOverrides?: RuleContext["siteOverrides"]
): RuleContext {
  return {
    url: window.location.href,
    domain: window.location.hostname,
    currentTime: new Date().toISOString(),
    calmModeActive,
    ...(siteOverrides !== undefined && { siteOverrides }),
    document,
    window,
  };
}
