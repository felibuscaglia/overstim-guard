import type {
  ScheduleConfig,
  FixedSchedule,
  SunsetSunriseSchedule,
  TimeServiceState,
} from "@/types/schedule";
import * as SunCalc from "suncalc";

/**
 * TimeService — Centralized time and schedule management
 *
 * Responsibilities:
 * — Track current time
 * — Calculate sleep window based on schedule
 * — Determine calm mode state
 * — Emit events on state changes
 * — Use setTimeout for efficient recalculation (no aggressive polling)
 */

export class TimeService {
  private state: TimeServiceState;
  private listeners: Set<(state: TimeServiceState) => void> = new Set();
  private timeoutId: number | null = null;
  private isRunning = false;

  constructor(initialSchedule: ScheduleConfig) {
    const now = new Date();

    this.state = {
      currentTime: now,
      calmModeActive: false,
      nextStateChange: null,
      schedule: initialSchedule,
    };

    // Calculate initial state
    this.recalculate();
  }

  // Start the time service
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.scheduleNextUpdate();
  }

  // Stop the time service
  stop(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.isRunning = false;
  }

  // Update the schedule configuration
  updateSchedule(schedule: ScheduleConfig): void {
    this.state.schedule = schedule;
    this.recalculate();
  }

  getState(): Readonly<TimeServiceState> {
    return { ...this.state };
  }

  onStateChange(listener: (state: TimeServiceState) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  // Recalculate calm mode state and schedule next update
  private recalculate(): void {
    const now = new Date();
    this.state.currentTime = now;

    // Determine if calm mode should be active
    const wasActive = this.state.calmModeActive;
    this.state.calmModeActive = this.isInSleepWindow(now);

    this.state.nextStateChange = this.calculateNextStateChange(now);

    if (wasActive !== this.state.calmModeActive) {
      this.emitStateChange();
    }

    if (this.isRunning) {
      this.scheduleNextUpdate();
    }
  }

  private isInSleepWindow(time: Date): boolean {
    const { schedule } = this.state;

    return schedule.type === "fixed"
      ? this.isInFixedWindow(time, schedule)
      : this.isInSunsetSunriseWindow(time, schedule);
  }

  // Check if time is within fixed schedule window
  private isInFixedWindow(time: Date, schedule: FixedSchedule): boolean {
    const timezone =
      schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const [startHour = 0, startMinute = 0] = schedule.sleepStart
      .split(":")
      .map(Number);
    const [endHour = 0, endMinute = 0] = schedule.sleepEnd
      .split(":")
      .map(Number);

    const today = new Date(time);
    const sleepStart = new Date(today);
    sleepStart.setHours(startHour, startMinute, 0, 0);

    const sleepEnd = new Date(today);
    sleepEnd.setHours(endHour, endMinute, 0, 0);

    if (sleepStart > sleepEnd) {
      return time >= sleepStart || time < sleepEnd;
    } else {
      return time >= sleepStart && time < sleepEnd;
    }
  }

  private isInSunsetSunriseWindow(
    time: Date,
    schedule: SunsetSunriseSchedule
  ): boolean {
    const { latitude, longitude } = schedule;
    const offsetBeforeSunset = schedule.offsetBeforeSunset || 0;
    const offsetAfterSunrise = schedule.offsetAfterSunrise || 0;

    const { sunset, sunrise } = this.calculateSunsetAndSunrise(
      time,
      latitude,
      longitude
    );

    // Adjust times by offsets
    const sleepStart = new Date(
      sunset.getTime() - offsetBeforeSunset * 60 * 1000
    );
    const sleepEnd = new Date(
      sunrise.getTime() + offsetAfterSunrise * 60 * 1000
    );

    // Handle overnight window
    if (sleepStart > sleepEnd) {
      return time >= sleepStart || time < sleepEnd;
    } else {
      return time >= sleepStart && time < sleepEnd;
    }
  }

  private calculateSunsetAndSunrise(
    date: Date,
    lat: number,
    lon: number
  ): { sunrise: Date; sunset: Date } {
    const { sunset, sunrise } = SunCalc.getTimes(date, lat, lon);
    return { sunset, sunrise };
  }

  // Calculate when the next state change will occur
  private calculateNextStateChange(now: Date): Date | null {
    const { schedule } = this.state;

    return schedule.type === "fixed"
      ? this.calculateNextFixedChange(now, schedule)
      : this.calculateNextSunsetSunriseChange(now, schedule);
  }

  private calculateNextFixedChange(now: Date, schedule: FixedSchedule): Date {
    const [startHour = 0, startMinute = 0] = schedule.sleepStart
      .split(":")
      .map(Number);

    const [endHour = 0, endMinute = 0] = schedule.sleepEnd
      .split(":")
      .map(Number);

    const today = new Date(now);
    const sleepStart = new Date(today);
    sleepStart.setHours(startHour, startMinute, 0, 0);

    const sleepEnd = new Date(today);
    sleepEnd.setHours(endHour, endMinute, 0, 0);

    // If sleep window spans midnight, adjust
    if (sleepStart > sleepEnd) {
      if (now < sleepEnd) {
        // Currently in sleep window, next change is sleep end
        return sleepEnd;
      } else if (now >= sleepStart) {
        // Currently in sleep window, next change is tomorrow's sleep end
        sleepEnd.setDate(sleepEnd.getDate() + 1);
        return sleepEnd;
      } else {
        // Not in sleep window, next change is sleep start
        return sleepStart;
      }
    } else {
      // Same-day window
      if (now >= sleepStart && now < sleepEnd) {
        // In sleep window, next change is sleep start
        return sleepStart;
      } else {
        // After sleep window, next change is tomorrow's sleep start
        sleepStart.setDate(sleepStart.getDate() + 1);
        return sleepStart;
      }
    }
  }

  private calculateNextSunsetSunriseChange(
    now: Date,
    schedule: SunsetSunriseSchedule
  ): Date {
    const { latitude, longitude } = schedule;
    const offsetBeforeSunset = schedule.offsetBeforeSunset || 0;
    const offsetAfterSunrise = schedule.offsetAfterSunrise || 0;

    const { sunset, sunrise } = this.calculateSunsetAndSunrise(
      now,
      latitude,
      longitude
    );

    const sleepStart = new Date(
      sunset.getTime() + offsetBeforeSunset * 60 * 1000
    );
    const sleepEnd = new Date(
      sunrise.getTime() + offsetAfterSunrise * 60 * 100
    );

    // Adjust sleepEnd if it's before sleepStart (overnight window)
    let adjustedSleepEnd = sleepEnd;

    if (sleepStart > sleepEnd) {
      adjustedSleepEnd = new Date(sleepEnd);
      adjustedSleepEnd.setDate(adjustedSleepEnd.getDate() + 1);
    }

    if (now >= sleepStart && now < adjustedSleepEnd) {
      // In sleep window, next change is sleep end
      return adjustedSleepEnd;
    } else if (now < sleepStart) {
      // Before sleep window, next change is sleep start
      return sleepStart;
    } else {
      // After sleep window, calculate tomorrow's sleep start
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { sunset: tomorrowSunset } = this.calculateSunsetAndSunrise(
        tomorrow,
        latitude,
        longitude
      );

      return new Date(
        tomorrowSunset.getTime() - offsetBeforeSunset * 60 * 1000
      );
    }
  }

  private emitStateChange(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("Error in TimeService state change listener:", error);
      }
    });
  }

  private scheduleNextUpdate() {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    const now = Date.now();
    const nextChange = this.state.nextStateChange;

    if (!nextChange) {
      this.timeoutId = setTimeout(() => {
        this.recalculate();
      }, 60 * 1000);

      return;
    }

    const msUntilChange = nextChange.getTime() - now;

    if (msUntilChange <= 0) {
      // Next change is in the past, recalculate immediately
      this.recalculate();
      return;
    }

    // Schedule update slightly before the change (100ms buffer)
    const updateTime = Math.max(0, msUntilChange - 100);

    this.timeoutId = setTimeout(() => {
      this.recalculate();
    }, updateTime);
  }
}
