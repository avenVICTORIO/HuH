import type { Point, Region, TableDefinition, TableOption } from './model';

function table(
  id: string,
  number: string,
  x: number,
  y: number,
  width: number,
  height: number,
  region: Region,
  capacity: number,
  shape: 'square' | 'round' = 'square',
  seats: Point[] = [],
  isBarSeat = false,
): TableDefinition {
  return {
    id,
    number,
    x,
    y,
    width,
    height,
    region,
    capacity,
    shape,
    seats,
    isBarSeat,
  };
}

const horizontalTwo: Point[] = [
  { x: -4, y: 27 },
  { x: 79, y: 27 },
];

const horizontalFour: Point[] = [
  { x: -4, y: 27 },
  { x: -4, y: 82 },
  { x: 79, y: 27 },
  { x: 79, y: 82 },
];

const horizontalFive: Point[] = [
  { x: -4, y: 27 },
  { x: -4, y: 68 },
  { x: 79, y: 27 },
  { x: 79, y: 68 },
  { x: 38, y: 111 },
];

export const TABLES: TableDefinition[] = [
  table('101', '101', 426, 6, 47, 22, 'inside', 1, 'round', [], true),
  table('102', '102', 478, 6, 47, 22, 'inside', 1, 'round', [], true),
  table('103', '103', 530, 6, 47, 22, 'inside', 1, 'round', [], true),
  table('104', '104', 582, 6, 47, 22, 'inside', 1, 'round', [], true),
  table('105', '105', 634, 6, 47, 22, 'inside', 1, 'round', [], true),
  table('106', '106', 686, 6, 47, 22, 'inside', 1, 'round', [], true),
  table('107', '107', 738, 6, 47, 22, 'inside', 1, 'round', [], true),

  table('1', '1', 722, 68, 76, 109, 'inside', 4, 'square', horizontalFour),
  table('3', '3', 722, 182, 76, 54, 'inside', 2, 'square', horizontalTwo),
  table('4', '4', 722, 241, 76, 54, 'inside', 2, 'square', horizontalTwo),
  table('5', '5', 722, 299, 76, 54, 'inside', 2, 'square', horizontalTwo),
  table('6', '6', 722, 354, 76, 109, 'inside', 5, 'square', horizontalFive),
  table('19', '19', 525, 102, 76, 54, 'inside', 2, 'square', [
    { x: 38, y: -4 },
    { x: 38, y: 58 },
  ]),
  table('18', '18', 525, 191, 76, 54, 'inside', 2, 'square', [
    { x: 38, y: -4 },
    { x: 38, y: 58 },
  ]),
  table('15', '15', 201, 234, 76, 54, 'inside', 2, 'square', horizontalTwo),
  table('16', '16', 330, 234, 76, 54, 'inside', 2, 'square', horizontalTwo),
  table('17A', '17A', 354, 81, 76, 64, 'inside', 4, 'square', [
    { x: -4, y: 32 },
    { x: 79, y: 32 },
    { x: 38, y: -3 },
  ]),
  table('17', '17', 354, 145, 76, 64, 'inside', 4, 'square', [
    { x: -4, y: 32 },
    { x: 79, y: 32 },
    { x: 38, y: 66 },
  ]),
  table('14', '14', 179, 354, 76, 109, 'inside', 5, 'square', horizontalFive),
  table('13', '13', 288, 354, 76, 109, 'inside', 5, 'square', horizontalFive),
  table('12', '12', 396, 354, 76, 109, 'inside', 4, 'square', horizontalFour),
  table('11', '11', 505, 354, 76, 109, 'inside', 5, 'square', horizontalFive),
  table('9', '9', 614, 300, 76, 163, 'inside', 7, 'square', [
    { x: -4, y: 34 },
    { x: -4, y: 82 },
    { x: -4, y: 129 },
    { x: 79, y: 34 },
    { x: 79, y: 82 },
    { x: 79, y: 129 },
    { x: 38, y: 166 },
  ]),

  table('301', '301', 230, 84, 116, 78, 'outside', 4, 'square', [
    { x: 39, y: -3 },
    { x: 77, y: -3 },
    { x: 39, y: 81 },
    { x: 77, y: 81 },
  ]),
  table('302', '302', 384, 72, 86, 124, 'outside', 5, 'square', [
    { x: -3, y: 42 },
    { x: -3, y: 84 },
    { x: 89, y: 42 },
    { x: 89, y: 84 },
    { x: 43, y: 127 },
  ]),
  table('303', '303', 504, 72, 86, 124, 'outside', 5, 'square', [
    { x: -3, y: 42 },
    { x: -3, y: 84 },
    { x: 89, y: 42 },
    { x: 89, y: 84 },
    { x: 43, y: 127 },
  ]),
  table('304', '304', 628, 84, 116, 78, 'outside', 4, 'square', [
    { x: 39, y: -3 },
    { x: 77, y: -3 },
    { x: 39, y: 81 },
    { x: 77, y: 81 },
  ]),
  table('201', '201', 100, 300, 72, 150, 'outside', 4, 'square', [
    { x: -3, y: 45 },
    { x: -3, y: 105 },
    { x: 75, y: 45 },
    { x: 75, y: 105 },
  ]),
  table('202', '202', 200, 300, 72, 150, 'outside', 4, 'square', [
    { x: -3, y: 45 },
    { x: -3, y: 105 },
    { x: 75, y: 45 },
    { x: 75, y: 105 },
  ]),
  table('203', '203', 360, 300, 72, 150, 'outside', 4, 'square', [
    { x: -3, y: 45 },
    { x: -3, y: 105 },
    { x: 75, y: 45 },
    { x: 75, y: 105 },
  ]),
  table('204', '204', 460, 300, 72, 150, 'outside', 4, 'square', [
    { x: -3, y: 45 },
    { x: -3, y: 105 },
    { x: 75, y: 45 },
    { x: 75, y: 105 },
  ]),
  table('205', '205', 560, 300, 72, 150, 'outside', 4, 'square', [
    { x: -3, y: 45 },
    { x: -3, y: 105 },
    { x: 75, y: 45 },
    { x: 75, y: 105 },
  ]),
  table('206', '206', 660, 300, 72, 150, 'outside', 4, 'square', [
    { x: -3, y: 45 },
    { x: -3, y: 105 },
    { x: 75, y: 45 },
    { x: 75, y: 105 },
  ]),
];

export const JOIN_CHAINS: string[][] = [
  ['1', '3', '4', '5', '6'],
  ['19', '18'],
  ['17A', '17'],
  ['15', '16'],
  ['14', '13', '12', '11', '9'],
  ['301', '302', '303', '304'],
  ['201', '202'],
  ['203', '204', '205', '206'],
];

export const FLOOR_FIXTURES: Record<Region, {
  room: { x: number; y: number; width: number; height: number };
  benches: { x: number; y: number; width: number; height: number }[];
  columns: { x: number; y: number; width: number; height: number }[];
  labels: { x: number; y: number; width: number; height: number; label: string }[];
}> = {
  inside: {
    room: { x: 153, y: 4, width: 696, height: 505 },
    benches: [
      // Eckbank rechts + unten: EIN durchgehender Zug (Ecken geschlossen)
      { x: 802, y: 64, width: 14, height: 413 },
      { x: 165, y: 467, width: 652, height: 10 },
      { x: 165, y: 353, width: 14, height: 124 },
      // Bank um 17/17A: Ecken oben/unten geschlossen (Lücke = Säule)
      { x: 340, y: 70, width: 94, height: 9 },
      { x: 340, y: 81, width: 11, height: 58 },
      { x: 340, y: 153, width: 11, height: 56 },
      { x: 340, y: 211, width: 94, height: 9 },
    ],
    columns: [
      { x: 336, y: 138, width: 15, height: 16 },
      { x: 394, y: 463, width: 80, height: 20 },
    ],
    labels: [
      { x: 706, y: 36, width: 109, height: 22, label: 'Eingang' },
      { x: 349, y: 42, width: 85, height: 20, label: 'Küche' },
      { x: 175, y: 300, width: 99, height: 22, label: 'WC' },
    ],
  },
  outside: {
    room: { x: 60, y: 30, width: 700, height: 452 },
    benches: [],
    columns: [
      { x: 80, y: 458, width: 190, height: 12 },
      { x: 352, y: 458, width: 392, height: 12 },
    ],
    labels: [
      { x: 276, y: 455, width: 70, height: 16, label: 'Ausgang' },
      { x: 360, y: 236, width: 84, height: 20, label: 'Gehweg' },
    ],
  },
};

export function tableById(tableId: string): TableDefinition {
  const result = TABLES.find((candidate) => candidate.id === tableId);
  if (!result) {
    throw new Error(`Unknown table: ${tableId}`);
  }
  return result;
}

export function optionCapacity(tableIds: string[]): number {
  const sorted = [...tableIds].sort();
  const isSeventeenPair = sorted.length === 2
    && sorted[0] === '17'
    && sorted[1] === '17A';

  if (isSeventeenPair) {
    return 7;
  }

  return tableIds.reduce((sum, tableId) => sum + tableById(tableId).capacity, 0);
}

function contiguousSlices(chain: string[], maximumSize: number): string[][] {
  const result: string[][] = [];
  for (let size = 2; size <= Math.min(maximumSize, chain.length); size += 1) {
    for (let start = 0; start + size <= chain.length; start += 1) {
      result.push(chain.slice(start, start + size));
    }
  }
  return result;
}

export function buildTableOptions(includeBarSeats: boolean): TableOption[] {
  const singles = TABLES
    .filter((candidate) => includeBarSeats || !candidate.isBarSeat)
    .map<TableOption>((candidate) => ({
      id: `table:${candidate.id}`,
      tableIds: [candidate.id],
      region: candidate.region,
      capacity: candidate.capacity,
      connectionCount: 0,
      kind: 'single',
    }));

  const joined = JOIN_CHAINS.flatMap((chain) => contiguousSlices(chain, 3))
    .map<TableOption>((tableIds) => ({
      id: `join:${tableIds.join('+')}`,
      tableIds,
      region: tableById(tableIds[0]).region,
      capacity: optionCapacity(tableIds),
      connectionCount: tableIds.length - 1,
      kind: 'joined',
    }));

  return [...singles, ...joined];
}

export function formatTableList(tableIds: string[]): string {
  return tableIds.map((tableId) => tableById(tableId).number).join(' + ');
}

export function regionLabel(region: Region): string {
  return region === 'inside' ? 'innen' : 'außen';
}
