export type ScheduleType = "fixed" | "sunset-sunrise";

export interface FixedSchedule {
  type: "fixed";
  sleepStart: string; // HH:mm format (e.g., "22:00")
  sleepEnd: string; // HH:mm format (e.g., "07:00")
  timezone?: string; // Optional timezone (defaults to user's local timezone)
}

export interface SunsetSunriseSchedule {
  type: "sunset-sunrise";
  offsetBeforeSunset?: number; // Minutes before sunset to start (default: 0)
  offsetAfterSunrise?: number; // Minutes after sunrise to end (default: 0)
  latitude: number;
  longitude: number;
}

export type ScheduleConfig = FixedSchedule | SunsetSunriseSchedule;

export interface TimeServiceState {
  currentTime: Date;
  calmModeActive: boolean;
  nextStateChange: Date | null; // When calm mode state will change next
  schedule: ScheduleConfig;
}

export interface TimeServiceEvents {
  stateChanged: (state: TimeServiceState) => void;
}
