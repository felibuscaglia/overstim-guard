import type { ScheduleConfig } from "@/types/schedule";
import { StorageService } from "./storage-service";
import { TimeService } from "./time-service";

console.log("Overstim Guard background service worker loaded");

const storageService = new StorageService();
let timeService: TimeService | null = null;

async function initialize(): Promise<void> {
  let schedule = await storageService.getSchedule();

  if (!schedule) {
    schedule = storageService.getDefaultSchedule();
    await storageService.saveSchedule(schedule);
  }

  timeService = new TimeService(schedule);

  timeService.onStateChange((state) => {
    broadcastContextUpdate(state.calmModeActive);
  });

  timeService.start();

  const intiialState = timeService.getState();
  broadcastContextUpdate(intiialState.calmModeActive);
}

// Broadcast context update to all content scripts
async function broadcastContextUpdate(calmModeActive: boolean): Promise<void> {
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
        sendResponse({
          calmModeActive: false,
          siteOverrides: null,
        });

        return;
      }

      const state = timeService.getState();
      storageService.getSiteOverrides().then((siteOverrides) => {
        sendResponse({
          calmModeActive: state.calmModeActive,
          siteOverrides: siteOverrides || undefined,
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
