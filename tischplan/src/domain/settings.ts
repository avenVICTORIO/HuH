import type { AppSettings, DailyOpeningHours, Weekday } from './model';

export const WEEKDAYS: { id: Weekday; label: string; shortLabel: string }[] = [
  { id: 'monday', label: 'Montag', shortLabel: 'Mo' },
  { id: 'tuesday', label: 'Dienstag', shortLabel: 'Di' },
  { id: 'wednesday', label: 'Mittwoch', shortLabel: 'Mi' },
  { id: 'thursday', label: 'Donnerstag', shortLabel: 'Do' },
  { id: 'friday', label: 'Freitag', shortLabel: 'Fr' },
  { id: 'saturday', label: 'Samstag', shortLabel: 'Sa' },
  { id: 'sunday', label: 'Sonntag', shortLabel: 'So' },
];

const DEFAULT_DAY_HOURS: DailyOpeningHours = {
  intervals: [{ opensAt: '17:00', closesAt: '23:00' }],
};

export const DEFAULT_OPENING_HOURS = Object.fromEntries(
  WEEKDAYS.map(({ id }) => [id, { intervals: DEFAULT_DAY_HOURS.intervals.map((interval) => ({ ...interval })) }]),
) as Record<Weekday, DailyOpeningHours>;

export const DEFAULT_SETTINGS: AppSettings = {
  openingHours: DEFAULT_OPENING_HOURS,
  weatherLocation: null,
  cleaningMinutes: 15,
  joinMinutesPerConnection: 8,
  splitMinutesPerConnection: 5,
  defaultDurationSmallMinutes: 110,
  defaultDurationLargeMinutes: 150,
  largePartyThreshold: 6,
  freezeWindowMinutes: 30,
  arrivalNotificationLeadMinutes: 30,
  preparationNotificationLeadMinutes: 25,
  lateGraceMinutes: 15,
  solverRuntimeMilliseconds: 1_000,
  useBarSeatsForSingles: false,
  autoShareWalkIns: true,
  nativeNotificationsEnabled: false,
};

export function cloneOpeningHours(
  openingHours: Record<Weekday, DailyOpeningHours>,
): Record<Weekday, DailyOpeningHours> {
  return Object.fromEntries(
    WEEKDAYS.map(({ id }) => [id, {
      intervals: openingHours[id].intervals.map((interval) => ({ ...interval })),
    }]),
  ) as Record<Weekday, DailyOpeningHours>;
}

export function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    openingHours: cloneOpeningHours(settings.openingHours),
    weatherLocation: settings.weatherLocation ? { ...settings.weatherLocation } : null,
  };
}

function clockMinutes(value: string): number | undefined {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return undefined;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesClock(minutes: number): string {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${remainder}`;
}

export function weekdayForServiceDate(serviceDate: string): Weekday {
  const [year, month, day] = serviceDate.split('-').map(Number);
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAYS[(weekdayIndex + 6) % 7].id;
}

export function openingHoursForDate(serviceDate: string, settings: AppSettings): DailyOpeningHours {
  return settings.openingHours[weekdayForServiceDate(serviceDate)];
}

export function reservationTimePresets(
  serviceDate: string,
  settings: AppSettings,
  intervalMinutes = 30,
): string[] {
  const hours = openingHoursForDate(serviceDate, settings);
  const safeInterval = Math.max(5, Math.round(intervalMinutes / 5) * 5);
  const presets: string[] = [];
  for (const interval of hours.intervals) {
    const opensAt = clockMinutes(interval.opensAt);
    const closesAt = clockMinutes(interval.closesAt);
    if (opensAt === undefined || closesAt === undefined || closesAt <= opensAt) {
      continue;
    }
    for (let minutes = opensAt; minutes < closesAt; minutes += safeInterval) {
      presets.push(minutesClock(minutes));
    }
  }
  return [...new Set(presets)].sort();
}

export function isWithinOpeningHours(
  serviceDate: string,
  startTime: string,
  settings: AppSettings,
): boolean {
  const hours = openingHoursForDate(serviceDate, settings);
  const start = clockMinutes(startTime);
  if (start === undefined) {
    return false;
  }
  return hours.intervals.some((interval) => {
    const opensAt = clockMinutes(interval.opensAt);
    const closesAt = clockMinutes(interval.closesAt);
    return opensAt !== undefined && closesAt !== undefined && start >= opensAt && start < closesAt;
  });
}

export function formatOpeningHours(hours: DailyOpeningHours): string {
  return hours.intervals.map((interval) => `${interval.opensAt}–${interval.closesAt}`).join(' · ');
}

export function openingHoursValidationError(settings: AppSettings): string | undefined {
  for (const weekday of WEEKDAYS) {
    const intervals = settings.openingHours[weekday.id].intervals
      .map((interval) => ({
        interval,
        opensAt: clockMinutes(interval.opensAt),
        closesAt: clockMinutes(interval.closesAt),
      }))
      .sort((left, right) => (left.opensAt ?? 0) - (right.opensAt ?? 0));
    for (const item of intervals) {
      const validRange = item.opensAt !== undefined
        && item.closesAt !== undefined
        && item.closesAt > item.opensAt;
      if (!validRange) {
        return `${weekday.label}: Jedes Zeitfenster braucht eine gültige Öffnungs- und spätere Schließzeit.`;
      }
    }
    for (let index = 1; index < intervals.length; index += 1) {
      if (intervals[index].opensAt! < intervals[index - 1].closesAt!) {
        return `${weekday.label}: Öffnungszeitfenster dürfen sich nicht überschneiden.`;
      }
    }
  }
  return undefined;
}

export function defaultReservationStart(serviceDate: string, settings: AppSettings): string {
  return reservationTimePresets(serviceDate, settings)[0] ?? '18:00';
}

export function durationForPartySize(partySize: number, settings: AppSettings): number {
  return partySize >= settings.largePartyThreshold
    ? settings.defaultDurationLargeMinutes
    : settings.defaultDurationSmallMinutes;
}

export function sanitizeSettings(settings: AppSettings): AppSettings {
  const boundedInteger = (value: number, minimum: number, maximum: number): number => {
    if (!Number.isFinite(value)) {
      return minimum;
    }

    return Math.min(maximum, Math.max(minimum, Math.round(value)));
  };

  const openingHours = Object.fromEntries(WEEKDAYS.map(({ id }) => {
    const intervals = settings.openingHours[id].intervals
      .map((interval) => ({ ...interval }))
      .sort((left, right) => left.opensAt.localeCompare(right.opensAt));
    return [id, { intervals }];
  })) as Record<Weekday, DailyOpeningHours>;

  return {
    openingHours,
    weatherLocation: settings.weatherLocation
      ? {
          label: settings.weatherLocation.label.trim(),
          latitude: Math.min(90, Math.max(-90, settings.weatherLocation.latitude)),
          longitude: Math.min(180, Math.max(-180, settings.weatherLocation.longitude)),
        }
      : null,
    cleaningMinutes: boundedInteger(settings.cleaningMinutes, 0, 120),
    joinMinutesPerConnection: boundedInteger(settings.joinMinutesPerConnection, 0, 60),
    splitMinutesPerConnection: boundedInteger(settings.splitMinutesPerConnection, 0, 60),
    defaultDurationSmallMinutes: boundedInteger(settings.defaultDurationSmallMinutes, 30, 360),
    defaultDurationLargeMinutes: boundedInteger(settings.defaultDurationLargeMinutes, 30, 480),
    largePartyThreshold: boundedInteger(settings.largePartyThreshold, 2, 30),
    freezeWindowMinutes: boundedInteger(settings.freezeWindowMinutes, 0, 240),
    arrivalNotificationLeadMinutes: boundedInteger(settings.arrivalNotificationLeadMinutes, 0, 180),
    preparationNotificationLeadMinutes: boundedInteger(settings.preparationNotificationLeadMinutes, 0, 180),
    lateGraceMinutes: boundedInteger(settings.lateGraceMinutes, 0, 120),
    solverRuntimeMilliseconds: boundedInteger(settings.solverRuntimeMilliseconds, 25, 1_000),
    useBarSeatsForSingles: Boolean(settings.useBarSeatsForSingles),
    autoShareWalkIns: Boolean(settings.autoShareWalkIns),
    nativeNotificationsEnabled: Boolean(settings.nativeNotificationsEnabled),
  };
}
