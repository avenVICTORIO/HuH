import type {
  AppSettings,
  AppState,
  Assignment,
  AuditEntry,
  NotificationReceipt,
  Reservation,
  ServiceDayState,
  TaskAcknowledgement,
  UiState,
  ValidationIssue,
} from './model';
import { buildTableOptions, tableById } from './tableCatalog';
import { validatePlan } from './solver';

const RESERVATION_STATUSES = new Set([
  'unassigned', 'assigned', 'seated', 'cleaning', 'done', 'no-show', 'cancelled',
]);
const SOURCES = new Set(['phone', 'in-person', 'online', 'walk-in', 'other']);
const PREFERENCES = new Set(['none', 'inside', 'outside']);
const REGIONS = new Set(['inside', 'outside']);
const MODES = new Set(['exclusive', 'shared']);
const ASSIGNMENT_SOURCES = new Set(['auto', 'manual', 'recovery']);
const RUSH_STATUSES = new Set(['off', 'active', 'reconciliation-needed', 'reconciling']);
const FILTERS = new Set(['all', 'unassigned', 'assigned', 'seated']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string, errors: string[]): value is string {
  if (typeof value !== 'string') {
    errors.push(`${path} must be a string.`);
    return false;
  }
  return true;
}

function requireBoolean(value: unknown, path: string, errors: string[]): value is boolean {
  if (typeof value !== 'boolean') {
    errors.push(`${path} must be a boolean.`);
    return false;
  }
  return true;
}

function requireFiniteNumber(value: unknown, path: string, errors: string[]): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number.`);
    return false;
  }
  return true;
}

function optionalFiniteNumber(value: unknown, path: string, errors: string[]): void {
  if (value !== undefined) {
    requireFiniteNumber(value, path, errors);
  }
}

function validateAssignment(value: unknown, path: string, errors: string[]): value is Assignment {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }

  requireString(value.optionId, `${path}.optionId`, errors);
  if (!Array.isArray(value.tableIds) || value.tableIds.length === 0 || value.tableIds.some((id) => typeof id !== 'string')) {
    errors.push(`${path}.tableIds must be a non-empty string array.`);
  }
  if (!REGIONS.has(String(value.region))) {
    errors.push(`${path}.region is unsupported.`);
  }
  requireFiniteNumber(value.capacity, `${path}.capacity`, errors);
  if (!MODES.has(String(value.mode))) {
    errors.push(`${path}.mode is unsupported.`);
  }
  if (!ASSIGNMENT_SOURCES.has(String(value.source))) {
    errors.push(`${path}.source is unsupported.`);
  }
  requireBoolean(value.locked, `${path}.locked`, errors);
  requireFiniteNumber(value.assignedAt, `${path}.assignedAt`, errors);
  optionalFiniteNumber(value.preparedAt, `${path}.preparedAt`, errors);
  if (value.overrideReason !== undefined) {
    requireString(value.overrideReason, `${path}.overrideReason`, errors);
  }
  return true;
}

function validateReservation(value: unknown, index: number, errors: string[]): value is Reservation {
  const path = `reservations[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }

  requireString(value.id, `${path}.id`, errors);
  if (!requireString(value.serviceDate, `${path}.serviceDate`, errors) || !DATE_PATTERN.test(String(value.serviceDate))) {
    errors.push(`${path}.serviceDate must use YYYY-MM-DD.`);
  }
  if (!requireString(value.startTime, `${path}.startTime`, errors) || !TIME_PATTERN.test(String(value.startTime))) {
    errors.push(`${path}.startTime must use HH:mm.`);
  }
  requireFiniteNumber(value.durationMinutes, `${path}.durationMinutes`, errors);
  requireFiniteNumber(value.delayMinutes, `${path}.delayMinutes`, errors);
  requireFiniteNumber(value.partySize, `${path}.partySize`, errors);
  requireString(value.name, `${path}.name`, errors);
  requireString(value.phone, `${path}.phone`, errors);
  requireString(value.email, `${path}.email`, errors);
  requireString(value.notes, `${path}.notes`, errors);
  if (!SOURCES.has(String(value.source))) {
    errors.push(`${path}.source is unsupported.`);
  }
  if (!PREFERENCES.has(String(value.preference))) {
    errors.push(`${path}.preference is unsupported.`);
  }
  requireBoolean(value.allowTableSharing, `${path}.allowTableSharing`, errors);
  if (!RESERVATION_STATUSES.has(String(value.status))) {
    errors.push(`${path}.status is unsupported.`);
  }
  if (value.assignment !== undefined) {
    validateAssignment(value.assignment, `${path}.assignment`, errors);
  }
  optionalFiniteNumber(value.arrivedAt, `${path}.arrivedAt`, errors);
  optionalFiniteNumber(value.leftAt, `${path}.leftAt`, errors);
  optionalFiniteNumber(value.cleaningCompletedAt, `${path}.cleaningCompletedAt`, errors);
  optionalFiniteNumber(value.resetCompletedAt, `${path}.resetCompletedAt`, errors);
  requireFiniteNumber(value.createdAt, `${path}.createdAt`, errors);
  requireFiniteNumber(value.updatedAt, `${path}.updatedAt`, errors);

  if (typeof value.partySize === 'number' && (!Number.isInteger(value.partySize) || value.partySize < 1 || value.partySize > 50)) {
    errors.push(`${path}.partySize must be an integer between 1 and 50.`);
  }
  if (typeof value.durationMinutes === 'number' && value.durationMinutes < 1) {
    errors.push(`${path}.durationMinutes must be positive.`);
  }
  return true;
}

function validateServiceDay(value: unknown, key: string, errors: string[]): value is ServiceDayState {
  const path = `serviceDays.${key}`;
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }
  if (!requireString(value.date, `${path}.date`, errors) || value.date !== key) {
    errors.push(`${path}.date must match its map key.`);
  }
  if (value.weather !== 'dry' && value.weather !== 'rain') {
    errors.push(`${path}.weather is unsupported.`);
  }
  requireBoolean(value.outsideOpen, `${path}.outsideOpen`, errors);
  requireString(value.notes, `${path}.notes`, errors);
  if (!isRecord(value.rush)) {
    errors.push(`${path}.rush must be an object.`);
  } else {
    if (!RUSH_STATUSES.has(String(value.rush.status))) {
      errors.push(`${path}.rush.status is invalid.`);
    }
    optionalFiniteNumber(value.rush.startedAt, `${path}.rush.startedAt`, errors);
    optionalFiniteNumber(value.rush.endedAt, `${path}.rush.endedAt`, errors);
    optionalFiniteNumber(value.rush.reconciliationStartedAt, `${path}.rush.reconciliationStartedAt`, errors);
    optionalFiniteNumber(value.rush.reconciliationCompletedAt, `${path}.rush.reconciliationCompletedAt`, errors);
    if (!Array.isArray(value.rush.reconciledReservationIds)
      || value.rush.reconciledReservationIds.some((id) => typeof id !== 'string')) {
      errors.push(`${path}.rush.reconciledReservationIds must be a string array.`);
    }
  }
  return true;
}

function validateSettings(value: unknown, errors: string[]): value is AppSettings {
  if (!isRecord(value)) {
    errors.push('settings must be an object.');
    return false;
  }
  if (!isRecord(value.openingHours)) {
    errors.push('settings.openingHours must be an object.');
  } else {
    for (const weekday of WEEKDAY_KEYS) {
      const hours = value.openingHours[weekday];
      const path = `settings.openingHours.${weekday}`;
      if (!isRecord(hours)) {
        errors.push(`${path} must be an object.`);
        continue;
      }
      if (!Array.isArray(hours.intervals)) {
        errors.push(`${path}.intervals must be an array.`);
        continue;
      }
      const validIntervals: { opensAt: string; closesAt: string }[] = [];
      hours.intervals.forEach((interval, index) => {
        const intervalPath = `${path}.intervals[${index}]`;
        if (!isRecord(interval)) {
          errors.push(`${intervalPath} must be an object.`);
          return;
        }
        const validOpening = requireString(interval.opensAt, `${intervalPath}.opensAt`, errors)
          && TIME_PATTERN.test(String(interval.opensAt));
        const validClosing = requireString(interval.closesAt, `${intervalPath}.closesAt`, errors)
          && TIME_PATTERN.test(String(interval.closesAt));
        if (!validOpening) {
          errors.push(`${intervalPath}.opensAt must use HH:mm.`);
        }
        if (!validClosing) {
          errors.push(`${intervalPath}.closesAt must use HH:mm.`);
        }
        if (validOpening && validClosing) {
          const opensAt = String(interval.opensAt);
          const closesAt = String(interval.closesAt);
          if (closesAt <= opensAt) {
            errors.push(`${intervalPath}.closesAt must be later than opensAt.`);
          } else {
            validIntervals.push({ opensAt, closesAt });
          }
        }
      });
      validIntervals.sort((left, right) => left.opensAt.localeCompare(right.opensAt));
      for (let index = 1; index < validIntervals.length; index += 1) {
        if (validIntervals[index].opensAt < validIntervals[index - 1].closesAt) {
          errors.push(`${path}.intervals must not overlap.`);
        }
      }
    }
  }
  if (value.weatherLocation !== null) {
    if (!isRecord(value.weatherLocation)) {
      errors.push('settings.weatherLocation must be null or an object.');
    } else {
      requireString(value.weatherLocation.label, 'settings.weatherLocation.label', errors);
      const validLatitude = requireFiniteNumber(value.weatherLocation.latitude, 'settings.weatherLocation.latitude', errors);
      const validLongitude = requireFiniteNumber(value.weatherLocation.longitude, 'settings.weatherLocation.longitude', errors);
      if (validLatitude && (Number(value.weatherLocation.latitude) < -90 || Number(value.weatherLocation.latitude) > 90)) {
        errors.push('settings.weatherLocation.latitude must be between -90 and 90.');
      }
      if (validLongitude && (Number(value.weatherLocation.longitude) < -180 || Number(value.weatherLocation.longitude) > 180)) {
        errors.push('settings.weatherLocation.longitude must be between -180 and 180.');
      }
    }
  }
  const numericKeys: (keyof AppSettings)[] = [
    'cleaningMinutes',
    'joinMinutesPerConnection',
    'splitMinutesPerConnection',
    'defaultDurationSmallMinutes',
    'defaultDurationLargeMinutes',
    'largePartyThreshold',
    'freezeWindowMinutes',
    'arrivalNotificationLeadMinutes',
    'preparationNotificationLeadMinutes',
    'lateGraceMinutes',
    'solverRuntimeMilliseconds',
  ];
  for (const key of numericKeys) {
    requireFiniteNumber(value[key], `settings.${key}`, errors);
  }
  requireBoolean(value.useBarSeatsForSingles, 'settings.useBarSeatsForSingles', errors);
  requireBoolean(value.autoShareWalkIns, 'settings.autoShareWalkIns', errors);
  requireBoolean(value.nativeNotificationsEnabled, 'settings.nativeNotificationsEnabled', errors);
  return true;
}

function validateAcknowledgement(value: unknown, path: string, errors: string[]): value is TaskAcknowledgement {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }
  requireString(value.taskId, `${path}.taskId`, errors);
  optionalFiniteNumber(value.completedAt, `${path}.completedAt`, errors);
  optionalFiniteNumber(value.snoozedUntil, `${path}.snoozedUntil`, errors);
  return true;
}

function validateReceipt(value: unknown, path: string, errors: string[]): value is NotificationReceipt {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }
  requireString(value.taskId, `${path}.taskId`, errors);
  requireFiniteNumber(value.sentAt, `${path}.sentAt`, errors);
  return true;
}

function validateAudit(value: unknown, index: number, errors: string[]): value is AuditEntry {
  const path = `auditLog[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }
  requireString(value.id, `${path}.id`, errors);
  requireFiniteNumber(value.timestamp, `${path}.timestamp`, errors);
  requireString(value.action, `${path}.action`, errors);
  requireString(value.message, `${path}.message`, errors);
  if (value.entityId !== undefined) {
    requireString(value.entityId, `${path}.entityId`, errors);
  }
  return true;
}

function validateUi(value: unknown, errors: string[]): value is UiState {
  if (!isRecord(value)) {
    errors.push('ui must be an object.');
    return false;
  }
  if (!requireString(value.selectedServiceDate, 'ui.selectedServiceDate', errors)
    || !DATE_PATTERN.test(String(value.selectedServiceDate))) {
    errors.push('ui.selectedServiceDate must use YYYY-MM-DD.');
  }
  if (!REGIONS.has(String(value.selectedRegion))) {
    errors.push('ui.selectedRegion is invalid.');
  }
  if (!FILTERS.has(String(value.reservationFilter))) {
    errors.push('ui.reservationFilter is invalid.');
  }
  return true;
}

export function validateAppState(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return ['State must be an object.'];
  }
  if (value.schemaVersion !== 1) {
    errors.push('schemaVersion must be exactly 1. This build intentionally has no migration path.');
  }
  requireFiniteNumber(value.revision, 'revision', errors);
  requireFiniteNumber(value.lastSavedAt, 'lastSavedAt', errors);

  if (!Array.isArray(value.reservations)) {
    errors.push('reservations must be an array.');
  } else {
    value.reservations.forEach((reservation, index) => validateReservation(reservation, index, errors));
    const ids = value.reservations
      .filter(isRecord)
      .map((reservation) => reservation.id)
      .filter((id): id is string => typeof id === 'string');
    if (new Set(ids).size !== ids.length) {
      errors.push('Reservation ids must be unique.');
    }
  }

  if (!isRecord(value.serviceDays)) {
    errors.push('serviceDays must be an object.');
  } else {
    Object.entries(value.serviceDays).forEach(([key, serviceDay]) => validateServiceDay(serviceDay, key, errors));
  }
  validateSettings(value.settings, errors);

  if (!isRecord(value.taskAcknowledgements)) {
    errors.push('taskAcknowledgements must be an object.');
  } else {
    Object.entries(value.taskAcknowledgements).forEach(([key, acknowledgement]) => {
      validateAcknowledgement(acknowledgement, `taskAcknowledgements.${key}`, errors);
    });
  }
  if (!isRecord(value.notificationReceipts)) {
    errors.push('notificationReceipts must be an object.');
  } else {
    Object.entries(value.notificationReceipts).forEach(([key, receipt]) => {
      validateReceipt(receipt, `notificationReceipts.${key}`, errors);
    });
  }
  if (!Array.isArray(value.auditLog)) {
    errors.push('auditLog must be an array.');
  } else {
    value.auditLog.forEach((entry, index) => validateAudit(entry, index, errors));
  }
  validateUi(value.ui, errors);
  return errors;
}

export function assertValidAppState(value: unknown): asserts value is AppState {
  const errors = validateAppState(value);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

export function validateOperationalState(state: AppState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const options = buildTableOptions(state.settings.useBarSeatsForSingles);
  const optionIds = new Set(options.map((option) => option.id));

  for (const reservation of state.reservations) {
    const assignment = reservation.assignment;
    if (!assignment) {
      if (['assigned', 'seated', 'cleaning'].includes(reservation.status)) {
        issues.push({
          code: 'missing-assignment',
          message: `${reservation.name} has status ${reservation.status} without an assignment.`,
          reservationIds: [reservation.id],
          tableIds: [],
        });
      }
      continue;
    }
    if (!optionIds.has(assignment.optionId)) {
      issues.push({
        code: 'unknown-option',
        message: `${reservation.name} uses an unknown table option.`,
        reservationIds: [reservation.id],
        tableIds: assignment.tableIds,
      });
    }
    for (const tableId of assignment.tableIds) {
      try {
        tableById(tableId);
      } catch {
        issues.push({
          code: 'unknown-table',
          message: `${reservation.name} references unknown table ${tableId}.`,
          reservationIds: [reservation.id],
          tableIds: [tableId],
        });
      }
    }
    if (reservation.partySize > assignment.capacity) {
      issues.push({
        code: 'capacity',
        message: `${reservation.name}: ${reservation.partySize} guests exceed capacity ${assignment.capacity}.`,
        reservationIds: [reservation.id],
        tableIds: assignment.tableIds,
      });
    }
  }

  const dates = [...new Set(state.reservations.map((reservation) => reservation.serviceDate))];
  for (const date of dates) {
    issues.push(...validatePlan(state, date));
  }
  return issues;
}
