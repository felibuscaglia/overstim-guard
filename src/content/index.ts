import { AudioSurpriseBlockRule } from "@/rules/audio-surprise-block";
import { AutoplayBlockRule } from "@/rules/autoplay-block";
import { InfiniteScrollBlockRule } from "@/rules/infinite-scroll-block";
import { RuleRegistry } from "@/rules/registry";
import { ThumbnailDimmingRule } from "@/rules/thumbnail-dimming";
import { RuleContext } from "@/types/rule";
import { buildRuleContext } from "@/utils/context";

const registry = new RuleRegistry();

async function initializeRuleEngine(): Promise<void> {
  registry.register(new AutoplayBlockRule());
  registry.register(new InfiniteScrollBlockRule());
  registry.register(new ThumbnailDimmingRule());
  registry.register(new AudioSurpriseBlockRule());

  // Get initial context from background script
  const context = await getContextFromBackground();

  // Apply rules for initial page load
  registry.applyRules(context);
}

// Get context information from background script
async function getContextFromBackground(): Promise<RuleContext> {
  try {
    // Request context from background
    const response = await chrome.runtime.sendMessage({
      type: "GET_CONTEXT",
    });

    if (response?.calmModeActive !== undefined) {
      return buildRuleContext(
        response.calmModeActive,
        response.siteOverrides,
        response.currentTime
      );
    }
  } catch (error) {
    console.error("Error getting context from background:", error);
  }

  // Fallback: assume calm mode is inactive
  return buildRuleContext(false);
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "CONTEXT_UPDATED":
      const context = buildRuleContext(
        message.calmModeActive,
        message.siteOverrides,
        message.currentTime // Use time from background if provided
      );

      // Reapply rules with new context
      registry.reapply(context);
      sendResponse({ success: true });
      break;
    case "REAPPLY_RULES":
      getContextFromBackground().then((context) => {
        registry.reapply(context);
        sendResponse({ success: true });
      });
      return true;
    default:
      return false;
  }
});

// Handle visibility change (tab switching)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    // Tab became visible, reapply rules
    getContextFromBackground().then((context) => {
      registry.reapply(context);
    });
  }
});

// Handle page navigation (SPA support)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;

    // URL changed, reapply rules
    getContextFromBackground().then((context) => {
      registry.reapply(context);
    });
  }
}).observe(document, { subtree: true, childList: true });

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  registry.teardown();
});

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeRuleEngine);
} else {
  initializeRuleEngine();
}
