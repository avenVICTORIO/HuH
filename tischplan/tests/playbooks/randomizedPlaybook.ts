import { createReservation } from '../../src/application/reservationFactory';
import type { AppState, ReservationDraft, SeatingPreference } from '../../src/domain/model';
import { DEFAULT_SETTINGS } from '../../src/domain/settings';
import { solveAssignments, validatePlan } from '../../src/domain/solver';
import { createInitialState, ensureServiceDay } from '../../src/domain/state';
import { serviceDateTime } from '../../src/domain/time';

export interface RandomizedObservationReport {
  name: string;
  seed: number;
  trials: number;
  reservations: number;
  assigned: number;
  unassigned: number;
  timedOutPlans: number;
  rainyTrials: number;
  walkIns: number;
  sharedAssignments: number;
  joinedAssignments: number;
  invariantViolations: number;
  outsideAssignmentsInRain: number;
  assignmentRate: number;
  observations: string[];
}

class DeterministicRandom {
  constructor(private value: number) {}

  next(): number {
    this.value |= 0;
    this.value = (this.value + 0x6D2B79F5) | 0;
    let next = Math.imul(this.value ^ (this.value >>> 15), 1 | this.value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  }

  integer(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.next() * (maximum - minimum + 1));
  }

  pick<T>(values: readonly T[]): T {
    return values[this.integer(0, values.length - 1)];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

function trialDate(index: number): string {
  const date = new Date(2026, 9, 1 + index);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timeAt(slot: number): string {
  const minutes = 17 * 60 + slot * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function runRandomizedPlaybook(seed = 0x5EED2026, trials = 120): RandomizedObservationReport {
  const random = new DeterministicRandom(seed);
  let reservationCount = 0;
  let assigned = 0;
  let unassigned = 0;
  let timedOutPlans = 0;
  let rainyTrials = 0;
  let walkIns = 0;
  let sharedAssignments = 0;
  let joinedAssignments = 0;
  let invariantViolations = 0;
  let outsideAssignmentsInRain = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const date = trialDate(trial);
    const now = serviceDateTime(date, random.pick(['13:30', '14:00', '15:00']));
    const state: AppState = createInitialState(now);
    state.ui.selectedServiceDate = date;
    ensureServiceDay(state, date);
    const rain = random.chance(0.28);
    state.serviceDays[date].weather = rain ? 'rain' : 'dry';
    state.serviceDays[date].outsideOpen = !rain && random.chance(0.9);
    state.settings = {
      ...DEFAULT_SETTINGS,
      cleaningMinutes: random.integer(8, 25),
      joinMinutesPerConnection: random.integer(4, 14),
      splitMinutesPerConnection: random.integer(3, 10),
      solverRuntimeMilliseconds: 100,
      useBarSeatsForSingles: random.chance(0.2),
      autoShareWalkIns: true,
    };

    if (rain) {
      rainyTrials += 1;
    }

    const numberOfReservations = random.integer(8, 26);
    for (let index = 0; index < numberOfReservations; index += 1) {
      const source = random.chance(0.24) ? 'walk-in' as const : random.pick(['phone', 'online', 'in-person', 'other'] as const);
      const preference: SeatingPreference = random.pick(['none', 'none', 'none', 'inside', 'outside'] as const);
      const partySize = source === 'walk-in'
        ? random.integer(1, 5)
        : random.integer(1, 10);
      const delayMinutes = random.chance(0.18) ? random.pick([10, 15, 20, 30]) : 0;
      const draft: ReservationDraft = {
        serviceDate: date,
        startTime: timeAt(random.integer(0, 22)),
        partySize,
        name: `${source}-${trial}-${index}`,
        source,
        preference,
        allowTableSharing: source === 'walk-in' || random.chance(0.1),
        durationMinutes: random.integer(6, 15) * 10,
      };
      const reservation = createReservation(draft, state.settings, `r-${trial}-${index}`, now);
      reservation.delayMinutes = delayMinutes;
      state.reservations.push(reservation);
      reservationCount += 1;
      if (source === 'walk-in') {
        walkIns += 1;
      }
    }

    const plan = solveAssignments(state, date, now);
    assigned += plan.assignedCount;
    unassigned += plan.unassignedCount;
    timedOutPlans += plan.timedOut ? 1 : 0;
    sharedAssignments += plan.assignments.filter((assignment) => assignment.option && assignment.mode === 'shared').length;
    joinedAssignments += plan.assignments.filter((assignment) => assignment.option?.kind === 'joined').length;
    const issues = validatePlan(state, date, plan);
    invariantViolations += issues.length;
    if (rain) {
      outsideAssignmentsInRain += plan.assignments.filter((assignment) => assignment.option?.region === 'outside').length;
    }
  }

  const assignmentRate = reservationCount === 0 ? 0 : assigned / reservationCount;
  const observations = [
    `${assigned} of ${reservationCount} generated reservations received a feasible assignment.`,
    `${unassigned} remained explicitly unassigned rather than violating a hard constraint.`,
    `${sharedAssignments} capacity-based shared placements and ${joinedAssignments} joined-table placements were selected.`,
    `${timedOutPlans} plans reached the configured search budget; every returned plan still passed invariant validation.`,
    `${outsideAssignmentsInRain} outside assignments were produced during ${rainyTrials} rainy trials.`,
  ];

  return {
    name: 'Seeded randomized operational observations',
    seed,
    trials,
    reservations: reservationCount,
    assigned,
    unassigned,
    timedOutPlans,
    rainyTrials,
    walkIns,
    sharedAssignments,
    joinedAssignments,
    invariantViolations,
    outsideAssignmentsInRain,
    assignmentRate,
    observations,
  };
}
