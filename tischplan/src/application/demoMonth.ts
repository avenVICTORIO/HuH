import type {
  AppSettings,
  Reservation,
  ServiceDayState,
  TableDefinition,
  TableOption,
} from '../domain/model';
import { openingHoursForDate } from '../domain/settings';
import { createServiceDay } from '../domain/state';
import { buildTableOptions, TABLES } from '../domain/tableCatalog';
import { serviceDateTime, shiftServiceDate } from '../domain/time';

export interface DemoMonth {
  reservations: Reservation[];
  serviceDays: Record<string, ServiceDayState>;
  startDate: string;
  endDate: string;
}

const NAMES = [
  'Familie Berger', 'Müller', 'Schneider', 'Wagner', 'Fischer', 'Weber', 'Hoffmann',
  'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz',
  'Zimmermann', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Schmitt', 'Krause',
];

const LARGE_GROUP_NAMES = [
  'Geburtstag Lehmann',
  'Firmenrunde Nordlicht',
  'Familienfeier Özdemir',
  'Vereinsabend Grün-Weiß',
  'Jubiläum Hansen',
];

const JOINED_OPTION_IDS = [
  'join:14+13',
  'join:1+3+4',
  'join:12+11+9',
  'join:301+302',
  'join:203+204+205',
];

interface ReservedWindow {
  startsAtMinutes: number;
  endsAtMinutes: number;
}

function hash(value: string): number {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function clock(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function demandForDate(serviceDate: string): number {
  const weekday = new Date(`${serviceDate}T12:00:00`).getDay();
  return [66, 46, 50, 57, 70, 88, 92][weekday];
}

// Realistischer Vorlauf: die nächsten Tage sind voll, danach nimmt die
// Buchungslage ab (weiter entfernte Tage sind noch kaum reserviert).
function dayDensity(dayIndex: number, taper: boolean): number {
  if (!taper) return 1;
  if (dayIndex <= 2) return 1;
  return Math.max(0.04, 1 - (dayIndex - 2) / 16);
}

function partySizeFor(table: TableDefinition, seed: number): number {
  const sharedSeatSensitive = table.id === '17' || table.id === '17A';
  const maximum = Math.max(1, table.capacity - (sharedSeatSensitive ? 1 : 0));
  return 1 + seed % maximum;
}

function assignedReservation(
  option: TableOption,
  serviceDate: string,
  startMinutes: number,
  durationMinutes: number,
  partySize: number,
  name: string,
  notes: string,
  seed: number,
  now: number,
  makeId: () => string,
): Reservation {
  const startTime = clock(startMinutes);
  return {
    id: makeId(),
    serviceDate,
    startTime,
    durationMinutes,
    delayMinutes: 0,
    partySize,
    name,
    phone: seed % 4 === 0 ? `030 ${String(seed % 10_000_000).padStart(7, '0')}` : '',
    email: '',
    notes,
    source: seed % 3 === 0 ? 'online' : seed % 3 === 1 ? 'phone' : 'in-person',
    preference: seed % 5 === 0 ? 'none' : option.region,
    allowTableSharing: false,
    status: 'assigned',
    assignment: {
      optionId: option.id,
      tableIds: [...option.tableIds],
      region: option.region,
      capacity: option.capacity,
      mode: 'exclusive',
      source: 'auto',
      locked: false,
      assignedAt: Math.min(now, serviceDateTime(serviceDate, startTime)),
    },
    createdAt: now,
    updatedAt: now,
  };
}

function addReservedWindow(
  reservedWindows: Map<string, ReservedWindow[]>,
  option: TableOption,
  startMinutes: number,
  durationMinutes: number,
  settings: AppSettings,
): void {
  const setupMinutes = option.connectionCount * settings.joinMinutesPerConnection;
  const resetMinutes = option.connectionCount * settings.splitMinutesPerConnection;
  const window = {
    startsAtMinutes: startMinutes - setupMinutes,
    endsAtMinutes: startMinutes + durationMinutes + settings.cleaningMinutes + resetMinutes,
  };
  for (const tableId of option.tableIds) {
    const existing = reservedWindows.get(tableId) ?? [];
    existing.push(window);
    existing.sort((left, right) => left.startsAtMinutes - right.startsAtMinutes);
    reservedWindows.set(tableId, existing);
  }
}

function blockingWindow(
  windows: ReservedWindow[],
  startMinutes: number,
  occupiedMinutes: number,
): ReservedWindow | undefined {
  const endMinutes = startMinutes + occupiedMinutes;
  return windows.find((window) => (
    startMinutes < window.endsAtMinutes && endMinutes > window.startsAtMinutes
  ));
}

function joinedOptionForDay(dayIndex: number, rainy: boolean, options: TableOption[]): TableOption {
  const configuredOptions = JOINED_OPTION_IDS.map((optionId) => {
    const option = options.find((candidate) => candidate.id === optionId);
    if (!option) {
      throw new Error(`Demo-Tischkombination ${optionId} fehlt im Tischkatalog.`);
    }
    return option;
  });
  const availableOptions = rainy
    ? configuredOptions.filter((option) => option.region === 'inside')
    : configuredOptions;
  const option = availableOptions[Math.floor(dayIndex / 3) % availableOptions.length];
  if (!option) {
    throw new Error('Für die Demo ist keine zulässige Tischkombination verfügbar.');
  }
  return option;
}

export function buildDemoMonth(
  settings: AppSettings,
  startDate: string,
  now: number,
  makeId: () => string,
  taper = false,
): DemoMonth {
  const reservations: Reservation[] = [];
  const serviceDays: Record<string, ServiceDayState> = {};
  const tables = TABLES.filter((table) => !table.isBarSeat);
  const tableOptions = buildTableOptions(false);
  let endDate = startDate;

  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
    const serviceDate = shiftServiceDate(startDate, dayIndex);
    endDate = serviceDate;
    const day = createServiceDay(serviceDate);
    const rainy = hash(`${serviceDate}:weather`) % 11 === 0;
    day.weather = rainy ? 'rain' : 'dry';
    day.outsideOpen = !rainy;
    day.notes = dayIndex === 12 ? 'Demo: lokale Veranstaltung, erhöhte Nachfrage.' : '';
    serviceDays[serviceDate] = day;
    const demand = Math.round(demandForDate(serviceDate) * dayDensity(dayIndex, taper));
    const openingIntervals = openingHoursForDate(serviceDate, settings).intervals;
    const reservedWindows = new Map<string, ReservedWindow[]>();

    if (dayIndex % 3 === 0 && openingIntervals.length > 0 && (!taper || dayIndex <= 9)) {
      const option = joinedOptionForDay(dayIndex, rainy, tableOptions);
      const firstInterval = openingIntervals[0];
      const opensAt = clockMinutes(firstInterval.opensAt);
      const closesAt = clockMinutes(firstInterval.closesAt);
      if (opensAt < closesAt) {
        const startMinutes = Math.min(opensAt + 60, closesAt - 15);
        const seed = hash(`${serviceDate}:${option.id}:large-group`);
        const partySize = Math.min(option.capacity, 8 + seed % Math.max(1, option.capacity - 7));
        const durationMinutes = settings.defaultDurationLargeMinutes;
        reservations.push(assignedReservation(
          option,
          serviceDate,
          startMinutes,
          durationMinutes,
          partySize,
          LARGE_GROUP_NAMES[Math.floor(dayIndex / 3) % LARGE_GROUP_NAMES.length],
          `Demo: Tischkombination ${option.tableIds.join(' + ')} ist für diese Gruppe eingeplant.`,
          seed,
          now,
          makeId,
        ));
        addReservedWindow(reservedWindows, option, startMinutes, durationMinutes, settings);
      }
    }

    for (const table of tables) {
      if (table.region === 'outside' && rainy) {
        continue;
      }
      const tableDemand = demand - (table.region === 'outside' ? 8 : 0);
      if (hash(`${serviceDate}:${table.id}:active`) % 100 >= tableDemand) {
        continue;
      }
      let bookingIndex = 0;
      for (const interval of openingIntervals) {
        let cursor = clockMinutes(interval.opensAt) + hash(`${serviceDate}:${table.id}:offset`) % 3 * 15;
        const closesAt = clockMinutes(interval.closesAt);
        while (cursor < closesAt && bookingIndex < 3) {
          const seed = hash(`${serviceDate}:${table.id}:${bookingIndex}`);
          const partySize = partySizeFor(table, seed);
          const largeParty = partySize >= settings.largePartyThreshold;
          const durationMinutes = largeParty
            ? settings.defaultDurationLargeMinutes
            : settings.defaultDurationSmallMinutes;
          const conflict = blockingWindow(
            reservedWindows.get(table.id) ?? [],
            cursor,
            durationMinutes + settings.cleaningMinutes,
          );
          if (conflict) {
            cursor = conflict.endsAtMinutes;
            continue;
          }
          const shouldBook = seed % 100 < tableDemand || bookingIndex === 0;
          if (shouldBook) {
            const option = tableOptions.find((candidate) => candidate.id === `table:${table.id}`)!;
            reservations.push(assignedReservation(
              option,
              serviceDate,
              cursor,
              durationMinutes,
              partySize,
              NAMES[seed % NAMES.length],
              seed % 13 === 0 ? 'Demo: Kinderstuhl gewünscht' : '',
              seed,
              now,
              makeId,
            ));
            cursor += durationMinutes + settings.cleaningMinutes + 25;
            bookingIndex += 1;
          } else {
            cursor += 45;
          }
        }
      }
    }
  }

  return { reservations, serviceDays, startDate, endDate };
}
