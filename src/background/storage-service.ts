import type { ScheduleConfig } from "@/types/schedule";
import {
  DEFAULT_SETTINGS,
  type RuleConfig,
  type UserSettings,
} from "@/types/settings";

const STORAGE_KEYS = {
  SETTINGS: "userSettings",
};

// StorageService — Manages extension settings in chrome.storage.local
export class StorageService {
  async getSettings(): Promise<UserSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS] as UserSettings | undefined;

    return stored || this.defaultSettings;
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: settings,
    });
  }

  async getSchedule(): Promise<ScheduleConfig> {
    const { schedule } = await this.getSettings();
    return schedule;
  }

  async saveSchedule(schedule: ScheduleConfig): Promise<void> {
    const settings = await this.getSettings();
    settings.schedule = schedule;

    await this.saveSettings(settings);
  }

  async getSiteOverrides(): Promise<Record<string, RuleConfig>> {
    const { siteOverrides } = await this.getSettings();
    return siteOverrides;
  }

  async getSiteOverride(domain: string): Promise<RuleConfig | null> {
    const settings = await this.getSettings();
    return settings.siteOverrides[domain] || null;
  }

  async saveSiteOverrides(
    overrides: Record<string, RuleConfig>
  ): Promise<void> {
    const settings = await this.getSettings();
    settings.siteOverrides = overrides;

    await this.saveSettings(settings);
  }

  async updateSiteOverride(
    domain: string,
    override: RuleConfig
  ): Promise<void> {
    const settings = await this.getSettings();
    settings.siteOverrides[domain] = override;
    await this.saveSettings(settings);
  }

  async removeSiteOverride(domain: string): Promise<void> {
    const settings = await this.getSettings();
    delete settings.siteOverrides[domain];
    await this.saveSettings(settings);
  }

  async getEnabledRules(): Promise<string[]> {
    const { enabledRules } = await this.getSettings();
    return enabledRules;
  }

  async saveEnabledRules(rules: string[]): Promise<void> {
    const settings = await this.getSettings();
    settings.enabledRules = rules;
    await this.saveSettings(settings);
  }

  async getExtensionEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.extensionEnabled ?? true;
  }

  async setExtensionEnabled(enabled: boolean): Promise<void> {
    const settings = await this.getSettings();
    settings.extensionEnabled = enabled;
    await this.saveSettings(settings);
  }

  get defaultSettings(): UserSettings {
    return { ...DEFAULT_SETTINGS };
  }

  get defaultSchedule(): ScheduleConfig {
    return this.defaultSettings.schedule;
  }
}
