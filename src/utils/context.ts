import { RuleContext } from "@/types/rule";
import type { RuleConfig } from "@/types/settings";

// Builds a RuleContext from the current page state
export function buildRuleContext(
  calmModeActive: boolean,
  siteOverrides?: Record<string, RuleConfig>,
  currentTime?: string
): RuleContext {
  const domain = window.location.hostname;
  
  // Get the site override for the current domain (applies to all paths on that domain)
  const siteOverride: RuleConfig | undefined = siteOverrides?.[domain];

  return {
    url: window.location.href,
    domain,
    currentTime: currentTime || new Date().toISOString(),
    calmModeActive,
    ...(siteOverride !== undefined && { siteOverrides: siteOverride }),
    document,
    window,
  };
}
