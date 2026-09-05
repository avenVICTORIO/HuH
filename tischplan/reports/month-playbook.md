# Deterministic Month Playbook Report

Seed: `HAH-MONTH-2026-09-v1`

## Assertions

- PASS — allThirtyDaysExecuted
- PASS — allRequiredScenariosCovered
- PASS — noPhysicalInvariantViolations
- PASS — backupRoundTripSucceeded
- PASS — rushNotificationsSuppressed
- PASS — fourSoloWalkInsSharedOneTable
- PASS — rainNeverUsedOutside

## Daily observations

| Date | Scenario | Reservations | Assigned now | Open | Tasks | Issues | Observation |
|---|---|---:|---:|---:|---:|---:|---|
| 2026-09-01 | regular-auto-plan | 4 | 4 | 0 | 0 | 0 | Normaler Abend wurde automatisch geplant. |
| 2026-09-02 | inside-outside-preferences | 6 | 6 | 0 | 0 | 0 | Beide Bereichswünsche wurden eingehalten. |
| 2026-09-03 | manual-inside-to-outside-override | 5 | 5 | 0 | 0 | 0 | Manueller Bereichs-Override mit verpflichtender Begründung. |
| 2026-09-04 | rain-outside-closed | 1 | 0 | 1 | 1 | 0 | Regen sperrt Außenplätze; Reservierung bleibt sichtbar offen. |
| 2026-09-05 | rain-indoor-capacity-and-later-release | 2 | 1 | 0 | 1 | 0 | Außenwunsch wechselte wegen Regen nach innen; Neuplanung erfolgte erst nach realer Freigabe. |
| 2026-09-06 | walk-in-immediate-seating | 5 | 4 | 0 | 2 | 0 | Walk-in wurde mit einem direkten, logischen nächsten Schritt platziert. |
| 2026-09-07 | four-solo-walk-ins-share-one-table | 4 | 0 | 0 | 0 | 0 | Vier unabhängige Einzel-Walk-ins teilen kapazitätsbasiert einen Vierertisch. |
| 2026-09-08 | late-arrival | 5 | 4 | 0 | 2 | 0 | Verspätung verschiebt die operative Ankunft und bleibt im Audit sichtbar. |
| 2026-09-09 | no-show | 5 | 4 | 0 | 2 | 0 | No-Show gibt die geplanten Ressourcen wieder frei. |
| 2026-09-10 | cancellation | 5 | 4 | 0 | 0 | 0 | Stornierung bleibt im Tagesverlauf nachvollziehbar. |
| 2026-09-11 | joined-table-preparation | 5 | 5 | 0 | 3 | 0 | Aufbauaufgabe wurde rechtzeitig erledigt und quittiert. |
| 2026-09-12 | cleaning-and-split | 5 | 4 | 0 | 3 | 0 | Reinigung und Rückbau sind getrennte, explizit abschließbare Schritte. |
| 2026-09-13 | keep-same-joined-configuration | 6 | 1 | 4 | 5 | 0 | Identische Folgetafel bleibt aufgebaut; nur Reinigung ist nötig. |
| 2026-09-14 | regular-guests-last-resort-sharing | 2 | 2 | 0 | 0 | 0 | Reguläre Reservierungen teilen nur nach expliziter Zustimmung und Begründung. |
| 2026-09-15 | too-late-to-join | 1 | 0 | 1 | 1 | 0 | Zu knappe Aufbauzeit führt bewusst zu offenem Vorgang statt falscher Sicherheit. |
| 2026-09-16 | task-snooze-and-complete | 4 | 4 | 0 | 0 | 0 | Aufgaben können verschoben und eindeutig abgeschlossen werden. |
| 2026-09-17 | rush-mode-notification-suppression | 1 | 0 | 0 | 0 | 0 | Rush-Modus stoppt störende native Hinweise und erzwingt anschließend den Raumabgleich. |
| 2026-09-18 | rush-reconciliation-untracked-walk-in | 2 | 0 | 0 | 0 | 0 | Unprotokolliertes reales Platzieren wird nach der Überlast sauber nacherfasst. |
| 2026-09-19 | rain-after-outside-plan-manual-recovery | 1 | 1 | 0 | 0 | 0 | Regen verschiebt niemanden heimlich; Konflikt wird sichtbar und manuell gelöst. |
| 2026-09-20 | manual-outside-closure | 5 | 3 | 2 | 2 | 0 | Außenbereich kann unabhängig vom Wetter betrieblich geschlossen werden. |
| 2026-09-21 | early-cleaning-completion | 4 | 3 | 0 | 1 | 0 | Früh abgeschlossene Reinigung gibt Kapazität sofort statt erst nach Schätzwert frei. |
| 2026-09-22 | delayed-departure-and-replan | 4 | 3 | 0 | 2 | 0 | Verspätete Abreise und geänderte Ankunft werden vor Neuplanung im Ist-Zustand erfasst. |
| 2026-09-23 | backup-export-import | 1 | 1 | 0 | 0 | 0 | Vollständiges, exakt validiertes Backup wurde auf einer frischen Instanz importiert. |
| 2026-09-24 | timing-settings-change | 4 | 4 | 0 | 0 | 0 | Betriebszeiten wurden angepasst und sofort in den Nebenbedingungen verwendet. |
| 2026-09-25 | long-stay-party | 5 | 5 | 0 | 0 | 0 | Individuelle lange Aufenthaltsdauer blockiert Ressourcen bis Reinigung und Rückbau abgeschlossen sind. |
| 2026-09-26 | mixed-reservation-sources | 8 | 8 | 0 | 0 | 0 | Alle unterstützten Reservierungsquellen durchlaufen denselben konsistenten Prozess. |
| 2026-09-27 | crowded-peak-service | 24 | 24 | 0 | 0 | 0 | Peak-Plan: 24 platziert, 0 bewusst offen. |
| 2026-09-28 | optional-bar-seats | 7 | 0 | 0 | 0 | 0 | Barplätze können gezielt zugeschaltet werden, bleiben standardmäßig aber aus der Planung. |
| 2026-09-29 | audit-trail | 4 | 4 | 0 | 0 | 0 | Wesentliche Bedienhandlungen sind revisionssicher im lokalen Audit nachvollziehbar. |
| 2026-09-30 | full-service-rehearsal | 3 | 1 | 0 | 1 | 0 | Abschlusstag kombiniert Planung, Vorbereitung, Ankunft, Außenbereich und reale Freigabe. |

## Totals

```json
{
  "reservations": 138,
  "assignedAtPlanTime": 46,
  "unassignedAtPlanTime": 1,
  "notifications": 5,
  "auditEntries": 291,
  "validationIssues": 0
}
```
