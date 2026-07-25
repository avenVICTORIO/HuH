export type Region = 'inside' | 'outside';
export type SeatingPreference = 'none' | Region;
export type WeatherKind = 'dry' | 'rain';
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ReservationSource = 'phone' | 'in-person' | 'online' | 'walk-in' | 'other';
export type ReservationStatus =
  | 'unassigned'
  | 'assigned'
  | 'seated'
  | 'cleaning'
  | 'done'
  | 'no-show'
  | 'cancelled';
export type AssignmentMode = 'exclusive' | 'shared';
export type AssignmentSource = 'auto' | 'manual' | 'recovery';
export type RushStatus = 'off' | 'active' | 'reconciliation-needed' | 'reconciling';
export type TaskPriority = 'critical' | 'high' | 'normal';
export type TaskKind =
  | 'arrival'
  | 'late-check'
  | 'prepare-join'
  | 'prepare-split'
  | 'cleaning'
  | 'rain-conflict'
  | 'unassigned-upcoming'
  | 'reconciliation';

export interface Point {
  x: number;
  y: number;
}

export interface TableDefinition {
  id: string;
  number: string;
  region: Region;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'square' | 'round';
  seats: Point[];
  isBarSeat?: boolean;
}

export interface TableOption {
  id: string;
  tableIds: string[];
  region: Region;
  capacity: number;
  connectionCount: number;
  kind: 'single' | 'joined';
}

export interface Assignment {
  optionId: string;
  tableIds: string[];
  region: Region;
  capacity: number;
  mode: AssignmentMode;
  source: AssignmentSource;
  locked: boolean;
  assignedAt: number;
  preparedAt?: number;
  overrideReason?: string;
}

export interface Reservation {
  id: string;
  serviceDate: string;
  startTime: string;
  durationMinutes: number;
  delayMinutes: number;
  partySize: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  source: ReservationSource;
  preference: SeatingPreference;
  allowTableSharing: boolean;
  status: ReservationStatus;
  assignment?: Assignment;
  arrivedAt?: number;
  leftAt?: number;
  cleaningCompletedAt?: number;
  resetCompletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface RushState {
  status: RushStatus;
  startedAt?: number;
  endedAt?: number;
  reconciliationStartedAt?: number;
  reconciliationCompletedAt?: number;
  reconciledReservationIds: string[];
}

export interface ServiceDayState {
  date: string;
  weather: WeatherKind;
  outsideOpen: boolean;
  rush: RushState;
  notes: string;
}

export interface OpeningInterval {
  opensAt: string;
  closesAt: string;
}

export interface DailyOpeningHours {
  intervals: OpeningInterval[];
}

export interface WeatherLocation {
  label: string;
  latitude: number;
  longitude: number;
}

export interface AppSettings {
  openingHours: Record<Weekday, DailyOpeningHours>;
  weatherLocation: WeatherLocation | null;
  cleaningMinutes: number;
  joinMinutesPerConnection: number;
  splitMinutesPerConnection: number;
  defaultDurationSmallMinutes: number;
  defaultDurationLargeMinutes: number;
  largePartyThreshold: number;
  freezeWindowMinutes: number;
  arrivalNotificationLeadMinutes: number;
  preparationNotificationLeadMinutes: number;
  lateGraceMinutes: number;
  solverRuntimeMilliseconds: number;
  useBarSeatsForSingles: boolean;
  autoShareWalkIns: boolean;
  nativeNotificationsEnabled: boolean;
}

export interface TaskAcknowledgement {
  taskId: string;
  completedAt?: number;
  snoozedUntil?: number;
}

export interface NotificationReceipt {
  taskId: string;
  sentAt: number;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  entityId?: string;
  message: string;
}

export interface UiState {
  selectedServiceDate: string;
  selectedRegion: Region;
  reservationFilter: 'all' | 'unassigned' | 'assigned' | 'seated';
}

export interface AppState {
  schemaVersion: 1;
  revision: number;
  reservations: Reservation[];
  serviceDays: Record<string, ServiceDayState>;
  settings: AppSettings;
  taskAcknowledgements: Record<string, TaskAcknowledgement>;
  notificationReceipts: Record<string, NotificationReceipt>;
  auditLog: AuditEntry[];
  ui: UiState;
  lastSavedAt: number;
}

export interface OperationalTask {
  id: string;
  kind: TaskKind;
  priority: TaskPriority;
  title: string;
  detail: string;
  dueAt: number;
  reservationId?: string;
  tableIds?: string[];
  actionLabel?: string;
}

export interface BackupEnvelope {
  format: 'hand-aufs-herz-backup';
  schemaVersion: 1;
  exportedAt: number;
  state: AppState;
}

export interface PlanAssignment {
  reservationId: string;
  option: TableOption | null;
  mode: AssignmentMode;
  cost: number;
}

export interface PlanResult {
  assignments: PlanAssignment[];
  fixedReservationIds: string[];
  score: number;
  assignedCount: number;
  unassignedCount: number;
  changedCount: number;
  timedOut: boolean;
  warnings: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  reservationIds: string[];
  tableIds: string[];
}

export interface ReservationDraft {
  serviceDate: string;
  startTime: string;
  partySize: number;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  source: ReservationSource;
  preference: SeatingPreference;
  allowTableSharing?: boolean;
  durationMinutes?: number;
}

export interface PlacementChoice {
  option: TableOption;
  mode: AssignmentMode;
  available: boolean;
  reason?: string;
  preferenceOverrideRequired: boolean;
  sharingOverrideRequired: boolean;
  /** Walk-in joins a table whose current party occupies it exclusively — staff must ask the seated guests first. */
  seatedSharingOverrideRequired: boolean;
  /** Walk-in fits only with a shortened stay before the next reservation on this table. */
  shortenedDurationMinutes?: number;
}
