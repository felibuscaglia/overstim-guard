import type { ScheduleConfig } from "@/types/schedule";

const STORAGE_KEYS = {
  SCHEDULE: "schedule",
  SITE_OVERRIDES: "siteOverrides",
};

// StorageService — Manages extension settings in chrome.storage.local
export class StorageService {
  async getSchedule(): Promise<ScheduleConfig | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SCHEDULE);
    return (result[STORAGE_KEYS.SCHEDULE] as ScheduleConfig) || null;
  }

  async saveSchedule(schedule: ScheduleConfig): Promise<void> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SCHEDULE]: schedule,
    });
  }

  async getSiteOverrides(): Promise<Record<string, object> | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_OVERRIDES);
    return (
      (result[STORAGE_KEYS.SITE_OVERRIDES] as Record<string, object>) || null
    );
  }

  async saveSiteOverrides(overrides: Record<string, object>): Promise<void> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SITE_OVERRIDES]: overrides,
    });
  }

  // Get default schedule (fallback)
  getDefaultSchedule(): ScheduleConfig {
    return {
      type: "fixed",
      sleepStart: "22:00",
      sleepEnd: "07:00",
    };
  }
}
