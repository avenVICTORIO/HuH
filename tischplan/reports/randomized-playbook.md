# Seeded Randomized Observation Report

Seed: `1592598566`
Trials: 120
Reservations: 2030
Assignment rate: 91.2%
Invariant violations: 0
Outside assignments during rain: 0

## Observations

- 1852 of 2030 generated reservations received a feasible assignment.
- 178 remained explicitly unassigned rather than violating a hard constraint.
- 280 capacity-based shared placements and 611 joined-table placements were selected.
- 102 plans reached the configured search budget; every returned plan still passed invariant validation.
- 0 outside assignments were produced during 37 rainy trials.

> Unassigned is a valid safety outcome: the software prefers an explicit unresolved task over violating capacity, weather, cleaning, setup, reset, or customer-preference constraints.
