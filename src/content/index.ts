import { AudioSurpriseBlockRule } from "@/rules/audio-surprise-block";
import { AutoplayBlockRule } from "@/rules/autoplay-block";
import { InfiniteScrollBlockRule } from "@/rules/infinite-scroll-block";
import { RuleRegistry } from "@/rules/registry";
import { ThumbnailDimmingRule } from "@/rules/thumbnail-dimming";
import { RuleContext } from "@/types/rule";
import { buildRuleContext } from "@/utils/context";
import { throttle } from "@github/mini-throttle";

const INJECTION_MARKER = "data-overstim-guard-injected";

(function () {
  if (document.documentElement.hasAttribute(INJECTION_MARKER)) {
    // Already injected, skip initialization
    console.log("[Overstim Guard] Content script already injected, skipping");
    return;
  }

  document.documentElement.setAttribute(INJECTION_MARKER, "true");

  const registry = new RuleRegistry();
  let urlChangeObserver: MutationObserver | null = null;

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

  function reapplyRules(): void {
    getContextFromBackground().then((context) => registry.reapply(context));
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
        reapplyRules();
        sendResponse({ success: true });
        return true;
      default:
        return false;
    }
  });

  // Handle visibility change (tab switching)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      // Tab became visible, reapply rules
      reapplyRules();
    }
  });

  // Handle page navigation (SPA support)
  let lastUrl = location.href;

  const handleUrlChange = throttle(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // URL changes, reapply rules
      reapplyRules();
    }
  }, 300);

  urlChangeObserver = new MutationObserver(() => {
    handleUrlChange();
  });

  urlChangeObserver.observe(document, { subtree: true, childList: true });

  // Handle browser back/forward navigation
  window.addEventListener("popstate", () => {
    reapplyRules();
  });

  // Handle hash changes
  window.addEventListener("hashchange", () => {
    reapplyRules();
  });

  window.addEventListener("beforeunload", () => {
    if(urlChangeObserver) {
      urlChangeObserver.disconnect();
      urlChangeObserver = null;
    }

    registry.teardown();

    document.documentElement.removeAttribute(INJECTION_MARKER);
  });

  if(document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initializeRuleEngine);
  } else {
    initializeRuleEngine();
  }
})();
