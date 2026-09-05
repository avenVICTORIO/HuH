export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class MutableClock implements Clock {
  constructor(private current: number) {}

  now(): number {
    return this.current;
  }

  set(epochMs: number): void {
    this.current = epochMs;
  }

  advance(minutes: number): void {
    this.current += minutes * 60_000;
  }
}
