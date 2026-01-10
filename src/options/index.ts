import type {
  ScheduleConfig,
  FixedSchedule,
  SunsetSunriseSchedule,
} from "@/types/schedule";
import type { RuleConfig, UserSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

// Rule definitions
const RULE_DEFINITIONS = [
  {
    id: "autoplay-block",
    name: "Autoplay",
    description: "Block automatic media playback",
  },
  {
    id: "infinite-scroll-block",
    name: "Infinite Scroll",
    description: "Limit feed consumption",
  },
  {
    id: "thumbnail-dimming",
    name: "Thumbnails",
    description: "Reduce visual intensity",
  },
  {
    id: "audio-surprise-block",
    name: "Audio Surprise",
    description: "Prevent unexpected sounds",
  },
];

let currentSettings: UserSettings = { ...DEFAULT_SETTINGS };
let saveTimeout: number | null = null;

// DOM Elements
const statusBadge = document.getElementById("status-badge")!;
const currentMode = document.getElementById("current-mode")!;
const scheduleTypeFixed = document.getElementById(
  "schedule-type-fixed"
) as HTMLInputElement;
const scheduleTypeSunset = document.getElementById(
  "schedule-type-sunset"
) as HTMLInputElement;
const fixedScheduleFields = document.getElementById(
  "fixed-schedule-fields"
)!;
const sunsetScheduleFields = document.getElementById(
  "sunset-schedule-fields"
)!;
const sleepStart = document.getElementById("sleep-start") as HTMLInputElement;
const sleepEnd = document.getElementById("sleep-end") as HTMLInputElement;
const timezone = document.getElementById("timezone") as HTMLSelectElement;
const latitude = document.getElementById("latitude") as HTMLInputElement;
const longitude = document.getElementById("longitude") as HTMLInputElement;
const offsetBeforeSunset = document.getElementById(
  "offset-before-sunset"
) as HTMLInputElement;
const offsetAfterSunrise = document.getElementById(
  "offset-after-sunrise"
) as HTMLInputElement;
const getLocationBtn = document.getElementById(
  "get-location-btn"
) as HTMLButtonElement;
const scheduleSaveIndicator = document.getElementById(
  "schedule-save-indicator"
)!;
const rulesCard = document.getElementById("rules-card")!;
const newSiteDomain = document.getElementById(
  "new-site-domain"
) as HTMLInputElement;
const overrideTypeDisable = document.getElementById(
  "override-type-disable"
) as HTMLInputElement;
const overrideTypeSelect = document.getElementById(
  "override-type-select"
) as HTMLInputElement;
const ruleSelectionGroup = document.getElementById(
  "rule-selection-group"
)!;
const overrideRulesCheckboxes = document.getElementById(
  "override-rules-checkboxes"
)!;
const addSiteOverrideBtn = document.getElementById(
  "add-site-override-btn"
) as HTMLButtonElement;
const siteOverridesList = document.getElementById("site-overrides-list")!;
const emptyOverridesState = document.getElementById(
  "empty-overrides-state"
)!;
const resetDefaultsBtn = document.getElementById(
  "reset-defaults-btn"
) as HTMLButtonElement;

// Initialize
async function initialize(): Promise<void> {
  await loadSettings();
  setupEventListeners();
  renderUI();
}

// Load settings from storage
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.local.get("userSettings");
    const stored = result.userSettings as UserSettings | undefined;
    currentSettings = stored || { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error("Error loading settings:", error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

// Setup event listeners
function setupEventListeners(): void {
  // Schedule type change
  scheduleTypeFixed.addEventListener("change", handleScheduleTypeChange);
  scheduleTypeSunset.addEventListener("change", handleScheduleTypeChange);

  // Fixed schedule fields
  sleepStart.addEventListener("change", debouncedSaveSchedule);
  sleepEnd.addEventListener("change", debouncedSaveSchedule);
  sleepStart.addEventListener("blur", validateTimeInput);
  sleepEnd.addEventListener("blur", validateTimeInput);
  timezone.addEventListener("change", debouncedSaveSchedule);

  // Sunset schedule fields
  latitude.addEventListener("change", debouncedSaveSchedule);
  longitude.addEventListener("change", debouncedSaveSchedule);
  offsetBeforeSunset.addEventListener("change", debouncedSaveSchedule);
  offsetAfterSunrise.addEventListener("change", debouncedSaveSchedule);
  latitude.addEventListener("blur", validateLatLng);
  longitude.addEventListener("blur", validateLatLng);
  getLocationBtn.addEventListener("click", handleGetLocation);

  // Override type change
  overrideTypeDisable.addEventListener("change", handleOverrideTypeChange);
  overrideTypeSelect.addEventListener("change", handleOverrideTypeChange);

  // Add site override
  addSiteOverrideBtn.addEventListener("click", handleAddSiteOverride);
  newSiteDomain.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleAddSiteOverride();
    }
  });

  // Reset defaults
  resetDefaultsBtn.addEventListener("click", handleResetDefaults);
}

// Render UI
function renderUI(): void {
  renderStatus();
  renderSchedule();
  renderRules();
  renderSiteOverrides();
}

// Render status badge
function renderStatus(): void {
  const state = currentSettings.extensionEnabled
    ? "Day mode"
    : "Extension disabled";
  currentMode.textContent = state;
  statusBadge.classList.toggle("calm", false); // Options page doesn't show calm mode
}

// Render schedule editor
function renderSchedule(): void {
  const schedule = currentSettings.schedule;

  if (schedule.type === "fixed") {
    scheduleTypeFixed.checked = true;
    fixedScheduleFields.style.display = "flex";
    sunsetScheduleFields.style.display = "none";

    sleepStart.value = schedule.sleepStart;
    sleepEnd.value = schedule.sleepEnd;
    if (schedule.timezone) {
      timezone.value = schedule.timezone;
    }
  } else {
    scheduleTypeSunset.checked = true;
    fixedScheduleFields.style.display = "none";
    sunsetScheduleFields.style.display = "flex";

    latitude.value = schedule.latitude.toString();
    longitude.value = schedule.longitude.toString();
    offsetBeforeSunset.value = (
      schedule.offsetBeforeSunset || 0
    ).toString();
    offsetAfterSunrise.value = (schedule.offsetAfterSunrise || 0).toString();
  }

  // Populate timezone options
  populateTimezoneOptions();
}

// Populate timezone selector
function populateTimezoneOptions(): void {
  const timezones = Intl.supportedValuesOf("timeZone");
  const currentValue = timezone.value;

  timezone.innerHTML = '<option value="">Use local timezone</option>';
  timezones.forEach((tz) => {
    const option = document.createElement("option");
    option.value = tz;
    option.textContent = tz;
    timezone.appendChild(option);
  });

  if (currentValue) {
    timezone.value = currentValue;
  }
}

// Handle schedule type change
function handleScheduleTypeChange(): void {
  if (scheduleTypeFixed.checked) {
    fixedScheduleFields.style.display = "flex";
    sunsetScheduleFields.style.display = "none";
    saveSchedule();
  } else {
    fixedScheduleFields.style.display = "none";
    sunsetScheduleFields.style.display = "flex";
    saveSchedule();
  }
}

// Debounced save schedule
function debouncedSaveSchedule(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = window.setTimeout(() => {
    saveSchedule();
  }, 300);
}

// Save schedule
async function saveSchedule(): Promise<void> {
  if (!validateSchedule()) {
    return;
  }

  showSaveIndicator(scheduleSaveIndicator, "saving");

  try {
    let schedule: ScheduleConfig;

    if (scheduleTypeFixed.checked) {
      schedule = {
        type: "fixed",
        sleepStart: sleepStart.value,
        sleepEnd: sleepEnd.value,
        timezone: timezone.value || undefined,
      };
    } else {
      schedule = {
        type: "sunset-sunrise",
        latitude: parseFloat(latitude.value),
        longitude: parseFloat(longitude.value),
        offsetBeforeSunset: parseInt(offsetBeforeSunset.value, 10) || 0,
        offsetAfterSunrise: parseInt(offsetAfterSunrise.value, 10) || 0,
      };
    }

    currentSettings.schedule = schedule;

    // Save to storage
    await chrome.storage.local.set({ userSettings: currentSettings });

    // Notify background to update TimeService
    await chrome.runtime.sendMessage({
      type: "UPDATE_SCHEDULE",
      schedule,
    });

    showSaveIndicator(scheduleSaveIndicator, "success");
  } catch (error) {
    console.error("Error saving schedule:", error);
    showSaveIndicator(scheduleSaveIndicator, "error");
  }
}

// Validate schedule
function validateSchedule(): boolean {
  let isValid = true;

  if (scheduleTypeFixed.checked) {
    isValid = validateTimeInput() && isValid;
  } else {
    isValid = validateLatLng() && isValid;
  }

  return isValid;
}

// Validate time input
function validateTimeInput(): boolean {
  const startError = document.getElementById("sleep-start-error")!;
  const endError = document.getElementById("sleep-end-error")!;

  startError.textContent = "";
  endError.textContent = "";

  if (!sleepStart.value || !sleepEnd.value) {
    return true; // Let HTML5 validation handle required
  }

  const [startHour = 0, startMin = 0] = sleepStart.value.split(":").map(Number);
  const [endHour = 0, endMin = 0] = sleepEnd.value.split(":").map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Overnight windows are valid (start > end)
  // Same-day windows are also valid (start < end)
  // Only invalid if they're exactly the same
  if (startTime === endTime) {
    startError.textContent = "Start and end times cannot be the same";
    endError.textContent = "Start and end times cannot be the same";
    sleepStart.classList.add("error");
    sleepEnd.classList.add("error");
    return false;
  }

  sleepStart.classList.remove("error");
  sleepEnd.classList.remove("error");
  return true;
}

// Validate lat/lng
function validateLatLng(): boolean {
  const latError = document.getElementById("latitude-error")!;
  const lngError = document.getElementById("longitude-error")!;

  latError.textContent = "";
  lngError.textContent = "";

  const lat = parseFloat(latitude.value);
  const lng = parseFloat(longitude.value);

  let isValid = true;

  if (isNaN(lat) || lat < -90 || lat > 90) {
    latError.textContent = "Latitude must be between -90 and 90";
    latitude.classList.add("error");
    isValid = false;
  } else {
    latitude.classList.remove("error");
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    lngError.textContent = "Longitude must be between -180 and 180";
    longitude.classList.add("error");
    isValid = false;
  } else {
    longitude.classList.remove("error");
  }

  return isValid;
}

// Handle get location
async function handleGetLocation(): Promise<void> {
  getLocationBtn.disabled = true;
  getLocationBtn.textContent = "Getting location...";

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    latitude.value = position.coords.latitude.toFixed(6);
    longitude.value = position.coords.longitude.toFixed(6);

    validateLatLng();
    await saveSchedule();
  } catch (error) {
    console.error("Error getting location:", error);
    const errorMsg = document.getElementById("latitude-error")!;
    errorMsg.textContent = "Unable to get location. Please enter manually.";
  } finally {
    getLocationBtn.disabled = false;
    getLocationBtn.textContent = "Use My Location";
  }
}

// Render rules
function renderRules(): void {
  rulesCard.innerHTML = "";

  const enabledRules = currentSettings.enabledRules;
  const allRulesEnabled = enabledRules.length === 0;

  RULE_DEFINITIONS.forEach((rule) => {
    const isEnabled = allRulesEnabled || enabledRules.includes(rule.id);

    const ruleItem = document.createElement("div");
    ruleItem.className = "rule-item";

    ruleItem.innerHTML = `
      <div class="rule-info">
        <label class="rule-label">${rule.name}</label>
        <span class="rule-description">${rule.description}</span>
      </div>
      <label class="switch switch-small">
        <input type="checkbox" data-rule-id="${rule.id}" ${isEnabled ? "checked" : ""} />
        <span class="slider"></span>
      </label>
    `;

    const toggle = ruleItem.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    toggle.addEventListener("change", () => handleRuleToggle(rule.id, toggle));

    rulesCard.appendChild(ruleItem);
  });
}

// Handle rule toggle
async function handleRuleToggle(ruleId: string, toggle: HTMLInputElement): Promise<void> {
  toggle.disabled = true;

  try {
    let enabledRules = [...currentSettings.enabledRules];
    const isEnabled = toggle.checked;

    if (isEnabled) {
      // Add to enabled rules if not already there
      if (!enabledRules.includes(ruleId)) {
        enabledRules.push(ruleId);
      }
    } else {
      // Remove from enabled rules
      enabledRules = enabledRules.filter((id) => id !== ruleId);
    }

    currentSettings.enabledRules = enabledRules;
    await chrome.storage.local.set({ userSettings: currentSettings });

    // Notify background
    await chrome.runtime.sendMessage({
      type: "TOGGLE_RULE",
      ruleId,
    });
  } catch (error) {
    console.error("Error toggling rule:", error);
    toggle.checked = !toggle.checked; // Revert on error
  } finally {
    toggle.disabled = false;
  }
}

// Render site overrides
function renderSiteOverrides(): void {
  siteOverridesList.innerHTML = "";

  const overrides = currentSettings.siteOverrides;
  const domains = Object.keys(overrides);

  if (domains.length === 0) {
    emptyOverridesState.style.display = "block";
    return;
  }

  emptyOverridesState.style.display = "none";

  domains.forEach((domain) => {
    const override = overrides[domain];
    if(!override) return;

    const overrideItem = document.createElement("div");
    overrideItem.className = "site-override-item";

    let detailsText = "";
    if (override.enabled === false) {
      detailsText = "All rules disabled";
    } else if (override.rules && override.rules.length > 0) {
      const ruleNames = override.rules
        .map((id) => RULE_DEFINITIONS.find((r) => r.id === id)?.name || id)
        .join(", ");
      detailsText = `Rules: ${ruleNames}`;
    } else {
      detailsText = "No specific rules";
    }

    overrideItem.innerHTML = `
      <div class="site-override-info">
        <div class="site-override-domain">${domain}</div>
        <div class="site-override-details">${detailsText}</div>
      </div>
      <div class="site-override-actions">
        <button class="btn-danger btn-small" data-domain="${domain}">
          Remove
        </button>
      </div>
    `;

    const removeBtn = overrideItem.querySelector(
      "button"
    ) as HTMLButtonElement;
    removeBtn.addEventListener("click", () => handleRemoveSiteOverride(domain));

    siteOverridesList.appendChild(overrideItem);
  });
}

// Handle override type change
function handleOverrideTypeChange(): void {
  if (overrideTypeSelect.checked) {
    ruleSelectionGroup.style.display = "block";
    renderOverrideRuleCheckboxes();
  } else {
    ruleSelectionGroup.style.display = "none";
  }
}

// Render override rule checkboxes
function renderOverrideRuleCheckboxes(): void {
  overrideRulesCheckboxes.innerHTML = "";

  RULE_DEFINITIONS.forEach((rule) => {
    const checkboxOption = document.createElement("label");
    checkboxOption.className = "checkbox-option";

    checkboxOption.innerHTML = `
      <input type="checkbox" value="${rule.id}" />
      <span class="checkbox-label">${rule.name}</span>
    `;

    overrideRulesCheckboxes.appendChild(checkboxOption);
  });
}

// Handle add site override
async function handleAddSiteOverride(): Promise<void> {
  const domain = newSiteDomain.value.trim();
  const domainError = document.getElementById("new-site-domain-error")!;

  domainError.textContent = "";

  if (!validateDomain(domain)) {
    domainError.textContent = "Please enter a valid domain (e.g., example.com)";
    newSiteDomain.classList.add("error");
    return;
  }

  newSiteDomain.classList.remove("error");
  addSiteOverrideBtn.disabled = true;

  try {
    let override: RuleConfig;

    if (overrideTypeDisable.checked) {
      override = { enabled: false };
    } else {
      const selectedRules = Array.from(
        overrideRulesCheckboxes.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"]:checked'
        )
      ).map((cb) => cb.value);

      if (selectedRules.length === 0) {
        domainError.textContent = "Please select at least one rule";
        return;
      }

      override = { rules: selectedRules };
    }

    currentSettings.siteOverrides[domain] = override;
    await chrome.storage.local.set({ userSettings: currentSettings });

    // Notify background to broadcast update
    await chrome.runtime.sendMessage({
      type: "BROADCAST_UPDATE",
    });

    // Clear form
    newSiteDomain.value = "";
    overrideTypeDisable.checked = true;
    ruleSelectionGroup.style.display = "none";
    overrideRulesCheckboxes
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));

    renderSiteOverrides();
  } catch (error) {
    console.error("Error adding site override:", error);
    domainError.textContent = "Error adding override. Please try again.";
  } finally {
    addSiteOverrideBtn.disabled = false;
  }
}

// Handle remove site override
async function handleRemoveSiteOverride(domain: string): Promise<void> {
  if (!confirm(`Remove override for ${domain}?`)) {
    return;
  }

  try {
    delete currentSettings.siteOverrides[domain];
    await chrome.storage.local.set({ userSettings: currentSettings });

    // Notify background to broadcast update
    await chrome.runtime.sendMessage({
      type: "BROADCAST_UPDATE",
    });

    renderSiteOverrides();
  } catch (error) {
    console.error("Error removing site override:", error);
    alert("Error removing override. Please try again.");
  }
}

// Validate domain
function validateDomain(domain: string): boolean {
  if (!domain) return false;

  // Basic domain validation: allow letters, numbers, dots, hyphens
  // Must start and end with alphanumeric
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// Handle reset defaults
async function handleResetDefaults(): Promise<void> {
  if (
    !confirm(
      "Are you sure you want to reset all settings to defaults? This cannot be undone."
    )
  ) {
    return;
  }

  resetDefaultsBtn.disabled = true;
  resetDefaultsBtn.textContent = "Resetting...";

  try {
    currentSettings = { ...DEFAULT_SETTINGS };
    await chrome.storage.local.set({ userSettings: currentSettings });

    // Notify background
    await chrome.runtime.sendMessage({
      type: "UPDATE_SCHEDULE",
      schedule: currentSettings.schedule,
    });

    // Reload UI
    renderUI();

    // Show success message
    alert("Settings have been reset to defaults.");
  } catch (error) {
    console.error("Error resetting defaults:", error);
    alert("Error resetting settings. Please try again.");
  } finally {
    resetDefaultsBtn.disabled = false;
    resetDefaultsBtn.textContent = "Reset All Settings";
  }
}

// Show save indicator
function showSaveIndicator(
  element: HTMLElement,
  state: "saving" | "success" | "error"
): void {
  element.className = `save-indicator ${state}`;

  if (state === "success") {
    setTimeout(() => {
      element.className = "save-indicator";
    }, 2000);
  }
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
