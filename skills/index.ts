// Skill-flow runtime: registry, chat entry point, inbox delivery, composition,
// persistence, and JSON-Schema validation (Ajv) of everything that crosses an
// actor boundary.
//
// A chat message arrives -> handleChat():
//   1. Is a run of this person waiting for an answer in this room? -> answer goes to its inbox.
//   2. Otherwise the system flow "router" receives the message. Its AI actor decides
//      whether to hand off to a flow (Result `handoff`). If not, the assistant replies normally.
// Composition: an actor may `call` another flow as a sub-flow; the parent waits (status
// "child") and, when the child ends, its result returns as Message `return` to the
// parent's actor named in `then`. Arbitrarily nestable. `handoff` delegates without return.
import { randomUUID } from "node:crypto";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { alle, eins, lauf, type Mitarbeiter } from "../db";
import * as chat from "../chat";
import * as live from "../live";
import * as ki from "../ki";
import { alsDatum } from "../reservierungen";
import {
  RESULT_SCHEMA, type Actor, type Context, type Flow, type FlowInfo, type Message, type Result,
  type RunStatus, type Schema, type State,
} from "./types";

import router from "./intent-router/flow";
import confirm from "./confirm/flow";
import logTime from "./log-time/flow";

/** Every flow folder registers here. */
export const FLOWS: Flow[] = [router, confirm, logTime];
export const ROUTER_ID = router.id;

const flowById = (id: string) => FLOWS.find((f) => f.id === id);
const actorOf = (f: Flow, id: string) => f.actors.find((a) => a.id === id);
const MAX_HOPS = 20;
/** Flows the router may start (no system flows, no components). */
const startable = (): FlowInfo[] =>
  FLOWS.filter((f) => !f.system && !f.component).map(({ id, name, description, examples }) => ({ id, name, description, examples }));

// ------------------------------------------------------------------ JSON Schema (Ajv)

const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: true });
addFormats(ajv);
const compiled = new WeakMap<object, ValidateFunction>();
function validatorFor(schema: Schema): ValidateFunction {
  let v = compiled.get(schema);
  if (!v) { v = ajv.compile(schema); compiled.set(schema, v); }
  return v;
}
/** Returns null when valid, otherwise a readable error text. */
export function validate(schema: Schema | undefined, data: unknown, what: string): string | null {
  if (!schema) return null;
  const v = validatorFor(schema);
  return v(data) ? null : `${what}: ${ajv.errorsText(v.errors, { separator: "; " })}`;
}
const resultValid = validatorFor(RESULT_SCHEMA);

// Registry lint at startup: broken references surface immediately in the server log.
for (const f of FLOWS) {
  const ids = new Set([...f.actors.map((a) => a.id), ...(f.refs ?? []).map((r) => "flow:" + r.flow)]);
  if (!actorOf(f, f.start)) console.error(`Skill „${f.id}“: start actor „${f.start}“ missing`);
  for (const e of f.edges) if (!ids.has(e.from) || !ids.has(e.to)) console.error(`Skill „${f.id}“: edge ${e.from} -> ${e.to} points nowhere`);
  for (const r of f.refs ?? []) if (!flowById(r.flow)) console.error(`Skill „${f.id}“: ref to unknown flow „${r.flow}“`);
  for (const s of [f.input, f.output, ...f.actors.flatMap((a) => [a.input, a.output])]) if (s) validatorFor(s); // compile = schema check
}

// ------------------------------------------------------------------ Types

export type Run = {
  id: string; flow: string; mitarbeiter_id: string; raum: string; status: RunStatus;
  aktueller_actor: string | null; zustand: string; erstellt: number; aktualisiert: number;
  eltern_id: string | null; rueckkehr_actor: string | null;
};
type Outcome = { status: RunStatus; handedOff?: string };

// ------------------------------------------------------------------ Chat entry

/** true when a flow took the message (answer to a pending question, or a start via the router). */
export async function handleChat(person: Mitarbeiter, room: string, text: string): Promise<boolean> {
  const waiting = await eins<Run>(
    "SELECT * FROM skill_laeufe WHERE mitarbeiter_id = ? AND raum = ? AND status = 'waiting' ORDER BY aktualisiert DESC LIMIT 1",
    person.id, room,
  );
  if (waiting) {
    void deliver(waiting.id, waiting.aktueller_actor!, { kind: "answer", text });
    return true;
  }
  const r = flowById(ROUTER_ID);
  if (!r) return false;
  const id = await newRun(r, person, room, {});
  const out = await deliver(id, r.start, { kind: "start", text }); // awaited: we need to know whether it handed off
  return !!out?.handedOff;
}

/** Start a flow manually (Skills page). Runs in the background. */
export async function start(flow: Flow, person: Mitarbeiter, room: string, text: string): Promise<string> {
  const id = await newRun(flow, person, room, {});
  void deliver(id, flow.start, { kind: "start", text });
  return id;
}

async function newRun(flow: Flow, person: Mitarbeiter, room: string, state: State, parent?: { id: string; actor: string }): Promise<string> {
  const id = randomUUID(), now = Date.now();
  await lauf(
    `INSERT INTO skill_laeufe (id, flow, mitarbeiter_id, raum, status, aktueller_actor, zustand, erstellt, aktualisiert, eltern_id, rueckkehr_actor)
     VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, ?)`,
    id, flow.id, person.id, room, flow.start, JSON.stringify(state), now, now, parent?.id ?? null, parent?.actor ?? null,
  );
  signal();
  return id;
}

// ------------------------------------------------------------------ Delivery

/** Put a message into an actor's inbox and drive the run until it waits, calls, or ends. */
async function deliver(runId: string, actorId: string, message: Message): Promise<Outcome | undefined> {
  const run = await eins<Run>("SELECT * FROM skill_laeufe WHERE id = ?", runId);
  if (!run) return;
  const flow = flowById(run.flow);
  const person = await eins<Mitarbeiter>("SELECT * FROM mitarbeiter WHERE id = ?", run.mitarbeiter_id);
  if (!flow || !person) return finish(run, "error", "Der Ablauf ist nicht mehr verfügbar.", {}, actorId);
  const quiet = !!(flow.system || flow.component);

  let state: State = {};
  try { state = JSON.parse(run.zustand || "{}"); } catch {}
  let actor: Actor | undefined = actorOf(flow, actorId);
  let inbox: Message = message;
  await setStatus(run.id, "running", actorId, state);

  for (let hop = 0; hop < MAX_HOPS && actor; hop++) {
    // 1) Input contract: the state must satisfy the actor's input schema.
    const inErr = validate(actor.input, state, `Eingabe von „${actor.name}“`);
    if (inErr) {
      await step(run.id, actor.id, "error", inbox, { error: inErr }, 0);
      return finish(run, "error", quiet ? "" : `Interner Fehler im Ablauf – ${inErr}`, state, actor.id);
    }
    const ctx: Context = {
      run: { id: run.id, flow: flow.id }, person, room: run.raum, today: alsDatum(new Date()),
      state, flows: startable(), ai: aiFor(),
    };
    const t0 = Date.now();
    let result: Result;
    try {
      result = await actor.handle(inbox, ctx);
    } catch (e) {
      await step(run.id, actor.id, "error", inbox, { error: String(e) }, Date.now() - t0);
      return finish(run, "error", quiet ? "" : `Da ist etwas schiefgelaufen (${actor.name}). Bitte versuch es später noch einmal.`, state, actor.id);
    }
    // 2) Result contract.
    if (!resultValid(result)) {
      const err = `Ergebnis von „${actor.name}“: ${ajv.errorsText(resultValid.errors, { separator: "; " })}`;
      await step(run.id, actor.id, "error", inbox, { error: err, result }, Date.now() - t0);
      return finish(run, "error", quiet ? "" : "Interner Fehler im Ablauf (ungültiges Actor-Ergebnis).", state, actor.id);
    }
    // 3) Output contract: the state patch must satisfy the actor's output schema.
    if (result.state) {
      const outErr = validate(actor.output, result.state, `Ausgabe von „${actor.name}“`);
      if (outErr) {
        await step(run.id, actor.id, "error", inbox, { error: outErr, result }, Date.now() - t0);
        return finish(run, "error", quiet ? "" : `Interner Fehler im Ablauf – ${outErr}`, state, actor.id);
      }
      state = { ...state, ...result.state };
    }
    await step(run.id, actor.id, kindOf(result), inbox, result, Date.now() - t0);

    if ("tell" in result) {
      if (result.say) await say(run.raum, flow, result.say);
      const next = actorOf(flow, result.tell);
      if (!next) return finish(run, "error", `Actor „${result.tell}“ fehlt im Flow.`, state, actor.id);
      inbox = { kind: "tell", from: actor.id };
      actor = next;
      await setStatus(run.id, "running", actor.id, state);
      continue;
    }
    if ("ask" in result) {
      await setStatus(run.id, "waiting", actor.id, state);
      await say(run.raum, flow, result.ask);
      return { status: "waiting" };
    }
    if ("handoff" in result) {
      const target = flowById(result.handoff);
      if (!target) return finish(run, "error", `Flow „${result.handoff}“ nicht gefunden.`, state, actor.id);
      await setStatus(run.id, "done", actor.id, state);
      const childId = await newRun(target, person, run.raum, {});
      void deliver(childId, target.start, { kind: "start", text: result.text ?? "" });
      return { status: "done", handedOff: target.id };
    }
    if ("call" in result) {
      const target = flowById(result.call);
      if (!target) return finish(run, "error", `Flow „${result.call}“ nicht gefunden.`, state, actor.id);
      if (!actorOf(flow, result.then)) return finish(run, "error", `Rückkehr-Actor „${result.then}“ fehlt im Flow.`, state, actor.id);
      const input = result.input ?? {};
      const callErr = validate(target.input, input, `Eingabe für Flow „${target.name}“`);
      if (callErr) {
        await step(run.id, actor.id, "error", inbox, { error: callErr }, 0);
        return finish(run, "error", quiet ? "" : `Interner Fehler im Ablauf – ${callErr}`, state, actor.id);
      }
      await setStatus(run.id, "child", result.then, state);
      const childId = await newRun(target, person, run.raum, input, { id: run.id, actor: result.then });
      void deliver(childId, target.start, { kind: "start", text: result.text ?? "" });
      return { status: "child" };
    }
    if ("done" in result) return finish(run, "done", result.done, state, actor.id);
    if ("cancel" in result) return finish(run, "cancelled", result.cancel, state, actor.id);
  }
  return finish(run, "error", "Der Ablauf hat sich verlaufen (zu viele Schritte).", state, actorId);
}

/** End a run, say the closing text, validate the flow's output contract, and return to the parent if any. */
async function finish(run: Run, status: RunStatus, text: string, state: State, actorId: string | null): Promise<Outcome> {
  const flow = flowById(run.flow);
  const quiet = !!(flow?.system || flow?.component);
  if (status === "done" && flow?.output) {
    const err = validate(flow.output, state, `Ergebnis von Flow „${flow.name}“`);
    if (err) {
      await step(run.id, actorId ?? "-", "error", null, { error: err }, 0);
      status = "error"; text = quiet ? "" : `Interner Fehler im Ablauf – ${err}`;
    }
  }
  await setStatus(run.id, status, actorId, state);
  if (text && flow) await say(run.raum, flow, text);
  if (run.eltern_id && run.rueckkehr_actor) {
    void deliver(run.eltern_id, run.rueckkehr_actor, { kind: "return", flow: run.flow, status, state });
  }
  return { status };
}

const kindOf = (r: Result) =>
  "tell" in r ? "tell" : "ask" in r ? "ask" : "handoff" in r ? "handoff" : "call" in r ? "call" : "done" in r ? "done" : "cancel";

async function setStatus(id: string, status: RunStatus, actor: string | null, state: State) {
  await lauf("UPDATE skill_laeufe SET status = ?, aktueller_actor = ?, zustand = ?, aktualisiert = ? WHERE id = ?",
    status, actor, JSON.stringify(state), Date.now(), id);
  signal();
}

async function step(runId: string, actor: string, kind: string, input: unknown, output: unknown, ms: number) {
  await lauf(
    "INSERT INTO skill_schritte (id, lauf_id, actor, art, eingabe, ausgabe, dauer_ms, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    randomUUID(), runId, actor, kind, JSON.stringify(input ?? null).slice(0, 4000), JSON.stringify(output ?? null).slice(0, 4000), ms, Date.now(),
  );
}

/** The flow speaks in chat as the assistant – with a flow prefix (system flows and components without). */
async function say(room: string, flow: Flow, text: string) {
  const prefix = flow.system || flow.component ? "" : `⚙️ ${flow.name}\n`;
  await chat.kiNachricht(room, prefix + text, randomUUID());
}

const signal = () => live.sende("alle", { typ: "skills" });

function aiFor(): Context["ai"] {
  return {
    active: ki.aktiv,
    text: (system, user) => ki.kiText(system, user),
    async json(system, user, schema) {
      let data = await ki.kiJson(system, user);
      if (!schema) return data as never;
      let err = validate(schema, data, "KI-Antwort");
      if (!err) return data as never;
      // One retry with the schema and the error spelled out.
      data = await ki.kiJson(
        `${system}\n\nDeine letzte Antwort war ungültig (${err}). Antworte exakt nach diesem JSON-Schema: ${JSON.stringify(schema)}`, user);
      err = validate(schema, data, "KI-Antwort");
      if (err) throw new Error(err);
      return data as never;
    },
  };
}

// ------------------------------------------------------------------ For the Skills page

/**
 * Catalog for the Skills page. Delegations declared by actors (`delegates`) are resolved
 * into flow nodes ("flow:<id>") and edges labelled handoff/call – so skill-to-skill
 * delegation is visible in the graph without hand-drawn refs. Static `refs`/`edges`
 * win when they already cover a target (they carry a chosen position).
 */
export function catalog() {
  return FLOWS.map((f) => {
    const refs: { flow: string; pos: { x: number; y: number }; name: string; via: "handoff" | "call" }[] =
      (f.refs ?? []).map((r) => ({ ...r, name: flowById(r.flow)?.name ?? r.flow, via: "call" as const }));
    const edges = [...f.edges];
    for (const a of f.actors) {
      for (const d of a.delegates ?? []) {
        const targets = (d.to === "startable" ? startable().map((x) => x.id) : d.to).filter((id) => id !== f.id);
        targets.forEach((id, i) => {
          const node = "flow:" + id;
          let ref = refs.find((r) => r.flow === id);
          if (!ref) {
            // Auto layout: stacked to the right of the delegating actor.
            ref = { flow: id, name: flowById(id)?.name ?? id, via: d.via, pos: { x: a.pos.x + 320, y: a.pos.y + (i - (targets.length - 1) / 2) * 170 } };
            refs.push(ref);
          } else ref.via = d.via;
          if (!edges.some((e) => e.from === a.id && e.to === node)) edges.push({ from: a.id, to: node, label: d.via });
        });
      }
    }
    return {
      id: f.id, name: f.name, description: f.description, examples: f.examples, start: f.start,
      system: !!f.system, component: !!f.component, input: f.input ?? null, output: f.output ?? null,
      actors: f.actors.map((a) => ({
        id: a.id, name: a.name, kind: a.kind, description: a.description, pos: a.pos,
        input: a.input ?? null, output: a.output ?? null,
        delegates: (a.delegates ?? []).map((d) => ({ via: d.via, to: d.to === "startable" ? startable().map((x) => x.id) : d.to })),
      })),
      refs, edges,
    };
  });
}

export async function runs(person: Mitarbeiter, seeAll: boolean, flowId: string | null, limit = 40) {
  const cond: string[] = [], params: unknown[] = [];
  if (!seeAll) { cond.push("l.mitarbeiter_id = ?"); params.push(person.id); }
  if (flowId) { cond.push("l.flow = ?"); params.push(flowId); }
  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
  const rows = await alle<Run & { person: string }>(
    `SELECT l.*, COALESCE(NULLIF(TRIM(CONCAT(m.vorname, ' ', COALESCE(m.nachname, ''))), ''), m.name) AS person
       FROM skill_laeufe l LEFT JOIN mitarbeiter m ON m.id = l.mitarbeiter_id ${where}
      ORDER BY l.aktualisiert DESC LIMIT ?`, ...params, limit);
  const ids = rows.map((r) => r.id);
  const steps = ids.length
    ? await alle<{ lauf_id: string; actor: string; art: string; ausgabe: string; dauer_ms: number; ts: number }>(
        `SELECT lauf_id, actor, art, ausgabe, dauer_ms, ts FROM skill_schritte WHERE lauf_id IN (${ids.map(() => "?").join(",")}) ORDER BY ts ASC`, ...ids)
    : [];
  const parse = (s: string) => { try { return JSON.parse(s); } catch { return s; } };
  return rows.map((r) => ({
    id: r.id, flow: r.flow, status: r.status, person: r.person, room: r.raum,
    createdAt: Number(r.erstellt), updatedAt: Number(r.aktualisiert), currentActor: r.aktueller_actor,
    parentId: r.eltern_id, state: parse(r.zustand || "{}"),
    steps: steps.filter((s) => s.lauf_id === r.id).map((s) => ({
      actor: s.actor, kind: s.art, ms: Number(s.dauer_ms), ts: Number(s.ts), output: parse(s.ausgabe),
    })),
  }));
}

/** Cancel a run (children too); a cancelled child reports back to its parent. */
export async function cancel(id: string, person: Mitarbeiter, mayAll: boolean): Promise<boolean> {
  const run = await eins<Run>("SELECT * FROM skill_laeufe WHERE id = ?", id);
  if (!run || (run.mitarbeiter_id !== person.id && !mayAll)) return false;
  const children = await alle<Run>("SELECT * FROM skill_laeufe WHERE eltern_id = ? AND status IN ('running','waiting','child')", id);
  for (const c of children) await lauf("UPDATE skill_laeufe SET status = 'cancelled', aktualisiert = ? WHERE id = ?", Date.now(), c.id);
  if (run.status === "running" || run.status === "waiting" || run.status === "child") {
    let state: State = {}; try { state = JSON.parse(run.zustand || "{}"); } catch {}
    await finish(run, "cancelled", "Abgebrochen.", state, run.aktueller_actor);
  }
  return true;
}
