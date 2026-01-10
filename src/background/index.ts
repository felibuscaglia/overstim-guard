import type { ScheduleConfig } from "@/types/schedule";
import { StorageService } from "./storage-service";
import { TimeService } from "./time-service";

console.log("Overstim Guard background service worker loaded");

const storageService = new StorageService();
let timeService: TimeService | null = null;

async function initialize(): Promise<void> {
  const schedule = await storageService.getSchedule();

  timeService = new TimeService(schedule);

  timeService.onStateChange((state) => {
    broadcastContextUpdate(state.calmModeActive);
  });

  timeService.start();

  const initialState = timeService.getState();
  broadcastContextUpdate(initialState.calmModeActive);
}

// Broadcast context update to all content scripts
async function broadcastContextUpdate(calmModeActive: boolean): Promise<void> {
  const extensionEnabled = await storageService.getExtensionEnabled();

  if (!extensionEnabled) {
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "CONTEXT_UPDATED",
            calmModeActive: false,
            extensionEnabled: false,
            siteOverrides: {},
          })
          .catch(() => {});
      }
    });

    return;
  }

  const siteOverrides = await storageService.getSiteOverrides();

  // Get all tabs
  const tabs = await chrome.tabs.query({});

  tabs.forEach((tab) => {
    if (tab.id) {
      chrome.tabs
        .sendMessage(tab.id, {
          type: "CONTEXT_UPDATED",
          calmModeActive,
          siteOverrides,
        })
        .catch(() => {
          // Ignore errors (tab might not have content script loaded)
        });
    }
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "GET_CONTEXT":
      if (!timeService) {
        storageService.getExtensionEnabled().then((extensionEnabled) => {
          sendResponse({
            calmModeActive: false,
            extensionEnabled,
            siteOverrides: {},
          });
        });

        return true;
      }

      const state = timeService.getState();
      Promise.all([
        storageService.getSiteOverrides(),
        storageService.getExtensionEnabled(),
      ]).then(([siteOverrides, extensionEnabled]) => {
        sendResponse({
          calmModeActive: extensionEnabled ? state.calmModeActive : false,
          extensionEnabled,
          siteOverrides,
          currentTime: state.currentTime.toISOString(),
        });
      });

      return true;

    case "UPDATE_SCHEDULE":
      const schedule = message.schedule as ScheduleConfig;

      if (timeService) {
        timeService.updateSchedule(schedule);
        storageService.saveSchedule(schedule).then(() => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "TimeService not initialized" });
      }

      return true;

    case "GET_EXTENSION_STATE":
      Promise.all([
        storageService.getExtensionEnabled(),
        storageService.getSiteOverrides(),
        chrome.tabs.query({ active: true, currentWindow: true }),
      ]).then(async ([extensionEnabled, siteOverrides, tabs]) => {
        const tab = tabs[0];
        const state = timeService?.getState();
        const calmModeActive =
          extensionEnabled && state?.calmModeActive ? true : false;

        let currentDomain: string | null = null;
        if (tab?.url) {
          try {
            const url = new URL(tab.url);
            currentDomain = url.hostname;
          } catch {
            // Invalid URL
          }
        }

        const siteOverride = currentDomain
          ? siteOverrides[currentDomain]
          : null;
        const enabledRules = state
          ? await storageService.getEnabledRules()
          : [];

        sendResponse({
          extensionEnabled,
          calmModeActive,
          currentDomain,
          siteOverride,
          enabledRules,
        });
      });

      return true;

    case "TOGGLE_EXTENSION":
      const newEnabled = message.enabled as boolean;
      storageService.setExtensionEnabled(newEnabled).then(() => {
        broadcastContextUpdate(timeService?.getState().calmModeActive ?? false);
        sendResponse({ success: true });
      });

      return true;

    case "TOGGLE_RULE":
      const ruleId = message.ruleId as string;
      storageService.getEnabledRules().then((enabledRules) => {
        const isEnabled = enabledRules.includes(ruleId);
        const newEnabledRules = isEnabled
          ? enabledRules.filter((id) => id !== ruleId)
          : [...enabledRules, ruleId];

        storageService.saveEnabledRules(newEnabledRules).then(() => {
          broadcastContextUpdate(
            timeService?.getState().calmModeActive ?? false
          );
          sendResponse({ success: true, enabled: !isEnabled });
        });
      });

      return true;

    case "TOGGLE_SITE_OVERRIDE":
      chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        const tab = tabs[0];
        if (!tab?.url) {
          sendResponse({ success: true, error: "No active tab" });
          return;
        }

        try {
          const url = new URL(tab.url);
          const domain = url.hostname;

          storageService.getSiteOverride(domain).then((existingOverride) => {
            if (existingOverride) {
              storageService.removeSiteOverride(domain).then(() => {
                broadcastContextUpdate(
                  timeService?.getState().calmModeActive ?? false
                );
                sendResponse({ success: true, removed: true });
              });
            } else {
              storageService
                .updateSiteOverride(domain, { enabled: false })
                .then(() => {
                  broadcastContextUpdate(
                    timeService?.getState().calmModeActive ?? false
                  );
                  sendResponse({ success: true, removed: false });
                });
            }
          });
        } catch {
          sendResponse({ success: false, error: "Invalid URL" });
        }
      });

      return true;

    default:
      return false;
  }
});

chrome.runtime.onStartup.addListener(() => {
  initialize();
});

chrome.runtime.onInstalled.addListener(() => {
  initialize();
});

// Initialize immediately if service worker is already running
initialize();
