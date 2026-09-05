// Ablauf-Checklisten: Aufgaben je Prozess + geteilter Tages-Fortschritt.
// Daten: Dokumentenspeicher (routine_tasks, routine_done); Schreiben ueber den Store.
import { alle, eins } from "./db";
import * as dok from "./dokumente";

export type Prozess = "aufbau" | "leerlauf" | "abbau";
export const PROZESSE: Prozess[] = ["aufbau", "leerlauf", "abbau"];
export const istProzess = (p: unknown): p is Prozess =>
  typeof p === "string" && (PROZESSE as string[]).includes(p);

export type Task = {
  id: string;
  process: Prozess;
  group: string | null;
  title: string;
  info: string | null;
  sort_order: number;
  active: number;
};

export type DayTask = Omit<Task, "active"> & {
  done: boolean;
  done_by: string | null;
  done_at: number | null;
};

export const TASKS = dok.store<Omit<Task, "id">>("routine_tasks");
export const DONE = dok.store<{ date: string; task_id: string; employee_id: string | null; done_at: number }>("routine_done");

/** Aktive Aufgaben eines Prozesses in chronologischer Reihenfolge. */
export const aufgaben = (process: Prozess) =>
  alle<Omit<Task, "active">>(
    'SELECT id, process, "group", title, info, sort_order FROM routine_tasks WHERE process = ? AND active = 1 ORDER BY sort_order, title',
    process,
  );

/** Aufgaben eines Prozesses inkl. Erledigt-Status für einen bestimmten Tag. */
export async function tag(process: Prozess, date: string) {
  const tasks = (await alle<DayTask>(
    `SELECT a.id, a.process, a."group", a.title, a.info, a.sort_order,
            (e.task_id IS NOT NULL) AS done, e.employee_id AS done_by, e.done_at
       FROM routine_tasks a
       LEFT JOIN routine_done e ON e.task_id = a.id AND e.date = ?
      WHERE a.process = ? AND a.active = 1
      ORDER BY a.sort_order, a.title`,
    date,
    process,
  )).map((a) => ({ ...a, done: !!a.done }));
  const done = tasks.filter((a) => a.done).length;
  return { process, tasks, done, total: tasks.length };
}

/** Kompakter Fortschritt je Prozess für einen Tag (für Vorschlag & Banner). */
export async function status(date: string) {
  const rows = await alle<{ process: Prozess; total: number | string; done: number | string }>(
    `SELECT a.process, COUNT(*) AS total, COUNT(e.task_id) AS done
       FROM routine_tasks a
       LEFT JOIN routine_done e ON e.task_id = a.id AND e.date = ?
      WHERE a.active = 1
      GROUP BY a.process`,
    date,
  );
  const out: Record<Prozess, { done: number; total: number; fertig: boolean }> = {
    aufbau: { done: 0, total: 0, fertig: false },
    leerlauf: { done: 0, total: 0, fertig: false },
    abbau: { done: 0, total: 0, fertig: false },
  };
  for (const r of rows) {
    const total = Number(r.total), done = Number(r.done);
    out[r.process] = { done, total, fertig: total > 0 && done >= total };
  }
  return out;
}

/** Aufgabe für einen Tag als erledigt markieren (idempotent, hält fest wer/wann). */
export async function erledigtSetzen(taskId: string, date: string, employeeId: string | null) {
  if (await eins("SELECT 1 AS x FROM routine_done WHERE date = ? AND task_id = ?", date, taskId)) return false;
  await DONE.create({ date, task_id: taskId, employee_id: employeeId, done_at: Date.now() }, employeeId);
  return true;
}

/** Erledigt-Haken wieder entfernen. */
export async function erledigtLoeschen(taskId: string, date: string, wer: string | null) {
  const z = await eins<{ id: string }>("SELECT id FROM routine_done WHERE date = ? AND task_id = ?", date, taskId);
  if (!z) return false;
  return DONE.remove(z.id, wer);
}

/** Nächste Sortiernummer am Ende eines Prozesses. */
export async function naechsteSortierung(process: Prozess): Promise<number> {
  const r = await eins<{ m: number | null }>(
    "SELECT MAX(sort_order) AS m FROM routine_tasks WHERE process = ?",
    process,
  );
  return (r?.m ?? -1) + 1;
}
