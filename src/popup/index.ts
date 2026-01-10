const RULE_IDS = {
  autoplay: "autoplay-block",
  feeds: "infinite-scroll-block",
  thumbnails: "thumbnail-dimming",
  audioSurprise: "audio-surprise-block",
};

interface ExtensionState {
  extensionEnabled: boolean;
  calmModeActive: boolean;
  currentDomain: string | null;
  siteOverride: { enabled?: boolean; rules?: string[] } | null;
  enabledRules: string[];
}

let currentState: ExtensionState = {
  extensionEnabled: true,
  calmModeActive: false,
  currentDomain: null,
  siteOverride: null,
  enabledRules: [],
};

const extensionToggle = document.getElementById(
  "extension-toggle"
) as HTMLInputElement;
const statusBadge = document.getElementById("status-badge")!;
const currentMode = document.getElementById("current-mode")!;
const autoplayToggle = document.getElementById(
  "autoplay-toggle"
) as HTMLInputElement;
const feedsToggle = document.getElementById("feeds-toggle") as HTMLInputElement;
const thumbnailsToggle = document.getElementById(
  "thumbnails-toggle"
) as HTMLInputElement;
const siteOverrideBtn = document.getElementById(
  "site-override-btn"
) as HTMLButtonElement;
const siteOverrideText = document.getElementById("site-override-text")!;
const audioSurpriseToggle = document.getElementById(
  "audio-surprise-toggle"
) as HTMLInputElement;

async function initialize(): Promise<void> {
  await loadState();
  setupEventListeners();
  updateUI();
}

async function loadState(retries = 0): Promise<void> {
  try {
    // Check if service worker is available
    if (!chrome.runtime?.id) {
      console.warn("Extension runtime not available");
      return;
    }
    const response = await chrome.runtime.sendMessage({
      type: "GET_EXTENSION_STATE",
    });

    if (response) {
      currentState = {
        extensionEnabled: response.extensionEnabled ?? true,
        calmModeActive: response.calmModeActive ?? false,
        currentDomain: response.currentDomain ?? null,
        siteOverride: response.siteOverride ?? null,
        enabledRules: response.enabledRules ?? [],
      };
    }
  } catch (error) {
    // Service worker might not be ready yet, so we try to wake it up
    if (retries < 10) {
      loadState(retries + 1);
    }

    console.error("Error loading state:", error);
  }
}

function setupEventListeners(): void {
  extensionToggle.addEventListener("change", handleExtensionToggle);
  autoplayToggle.addEventListener("change", handleAutoplayToggle);
  feedsToggle.addEventListener("change", handleFeedsToggle);
  thumbnailsToggle.addEventListener("change", handleThumbnailsToggle);
  audioSurpriseToggle.addEventListener("change", handleAudioSurpriseToggle);
  siteOverrideBtn.addEventListener("click", handleSiteOverride);
}

async function handleAutoplayToggle(): Promise<void> {
  await toggleRule(RULE_IDS.autoplay, autoplayToggle);
}

async function handleFeedsToggle(): Promise<void> {
  await toggleRule(RULE_IDS.feeds, feedsToggle);
}

async function handleThumbnailsToggle(): Promise<void> {
  await toggleRule(RULE_IDS.thumbnails, thumbnailsToggle);
}

async function handleAudioSurpriseToggle(): Promise<void> {
  await toggleRule(RULE_IDS.audioSurprise, audioSurpriseToggle);
}

async function toggleRule(
  ruleId: string,
  toggle: HTMLInputElement
): Promise<void> {
  const wasEnabled = toggle.checked;
  toggle.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TOGGLE_RULE",
      ruleId,
    });

    if (response?.success) {
      if (response.enabled) {
        if (!currentState.enabledRules.includes(ruleId)) {
          currentState.enabledRules.push(ruleId);
        }
      } else {
        currentState.enabledRules = currentState.enabledRules.filter(
          (id) => id !== ruleId
        );
      }
    } else {
      toggle.checked = !wasEnabled;
    }
  } catch (error) {
    console.error("Error toggling rule:", error);
    toggle.checked = !wasEnabled;
  } finally {
    toggle.disabled = false;
  }
}

async function handleSiteOverride(): Promise<void> {
  if (!currentState.currentDomain) return;

  siteOverrideBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "TOGGLE_SITE_OVERRIDE",
    });

    if (response?.success) {
      if (response.removed) {
        currentState.siteOverride = null;
      } else {
        currentState.siteOverride = { enabled: false };
      }

      updateUI();
    }
  } catch (error) {
    console.error("Error toggling site override:", error);
  } finally {
    siteOverrideBtn.disabled = false;
  }
}

async function handleExtensionToggle(): Promise<void> {
  const enabled = extensionToggle.checked;
  extensionToggle.disabled = true;

  try {
    await chrome.runtime.sendMessage({
      type: "TOGGLE_EXTENSION",
      enabled,
    });

    currentState.extensionEnabled = enabled;
    updateUI();
  } catch (error) {
    console.error("Error toggling extension:", error);
    extensionToggle.checked = !enabled;
  } finally {
    extensionToggle.disabled = false;
  }
}

function updateUI(): void {
  extensionToggle.checked = currentState.extensionEnabled;
  extensionToggle.disabled = false;

  const isCalmMode =
    currentState.extensionEnabled && currentState.calmModeActive;
  const mode = isCalmMode ? "Calm mode" : "Day mode";
  currentMode.textContent = mode;
  statusBadge.classList.toggle("calm", isCalmMode);

  const togglesEnabled = currentState.extensionEnabled;

  // If enabledRules is empty, all rules are enabled by default
  // If a rule ID is in enabledRules, that rule is enabled
  const isRuleEnabled = (ruleId: string) => {
    return (
      currentState.enabledRules.length === 0 ||
      currentState.enabledRules.includes(ruleId)
    );
  };

  const autoplayEnabled = togglesEnabled && isRuleEnabled(RULE_IDS.autoplay);
  autoplayToggle.checked = autoplayEnabled;
  autoplayToggle.disabled = !togglesEnabled;

  const feedsEnabled = togglesEnabled && isRuleEnabled(RULE_IDS.feeds);
  feedsToggle.checked = feedsEnabled;
  feedsToggle.disabled = !togglesEnabled;

  const thumbnailsEnabled =
    togglesEnabled && isRuleEnabled(RULE_IDS.thumbnails);
  thumbnailsToggle.checked = thumbnailsEnabled;
  thumbnailsToggle.disabled = !togglesEnabled;

  const audioSurpriseEnabled =
    togglesEnabled && isRuleEnabled(RULE_IDS.audioSurprise);
  audioSurpriseToggle.checked = audioSurpriseEnabled;
  audioSurpriseToggle.disabled = !togglesEnabled;

  const hasOverride = currentState.siteOverride !== null;
  siteOverrideBtn.disabled = !togglesEnabled || !currentState.currentDomain;
  siteOverrideBtn.classList.toggle("active", hasOverride);
  siteOverrideText.textContent = hasOverride
    ? "Enable for this site"
    : "Disable for this site";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
