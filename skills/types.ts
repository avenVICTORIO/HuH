// Skill flows: n8n-inspired workflows built from actors.
// A flow is a self-contained folder (flow.ts + actors/*). Every actor is a black
// box with an inbox: it receives a Message, works, and returns a Result that tells
// the runtime what happens next – tell the next actor, ask the person (run pauses),
// call another flow (composition), hand off to another flow, or finish.
//
// Every actor declares JSON Schemas for the state it reads (input) and writes
// (output). The runtime validates both with Ajv, as well as the Result shape and
// any JSON the AI produces on behalf of an actor.
import type { Mitarbeiter } from "../db";

/** A JSON Schema (draft-07 compatible object). */
export type Schema = Record<string, unknown>;

/** Shared state of a run – every actor may add or overwrite keys. */
export type State = Record<string, unknown>;

export type RunStatus = "running" | "waiting" | "child" | "done" | "cancelled" | "error";

/** What lands in an actor's inbox. */
export type Message =
  | { kind: "start"; text: string }                                       // the triggering chat message (or caller's text)
  | { kind: "tell"; from: string }                                        // handed over by the previous actor
  | { kind: "answer"; text: string }                                      // the person's reply to an `ask`
  | { kind: "return"; flow: string; status: RunStatus; state: State };    // a called sub-flow has finished

/** What an actor returns. Empty text on done/cancel = end silently (nothing in chat). */
export type Result =
  | { tell: string; say?: string; state?: State }                                    // post to the next actor's inbox
  | { ask: string; state?: State }                                                   // ask the person; the answer comes back here
  | { handoff: string; text?: string; state?: State }                                // hand over to another flow (no return)
  | { call: string; then: string; text?: string; input?: State; state?: State }      // call a sub-flow; its result returns to actor `then`
  | { done: string; state?: State }                                                  // finished successfully
  | { cancel: string; state?: State };                                               // finished without result

/** Public description of a flow – what a router-like actor sees. */
export type FlowInfo = { id: string; name: string; description: string; examples: string[] };

/** What the runtime hands every actor. */
export type Context = {
  run: { id: string; flow: string };
  person: Mitarbeiter;
  room: string;
  /** Today as YYYY-MM-DD (local). */
  today: string;
  state: State;
  /** All startable flows (no system flows, no components) – for router-like actors. */
  flows: FlowInfo[];
  /** AI access for "smart" actors. json() validates against `schema` (Ajv) and retries once. */
  ai: {
    active: boolean;
    json<T = Record<string, unknown>>(system: string, user: string, schema?: Schema): Promise<T>;
    text(system: string, user: string): Promise<string>;
  };
};

export type ActorKind = "ai" | "code";

export type Actor = {
  id: string;
  name: string;
  kind: ActorKind;
  description: string;
  /** Canvas position – the flow folder owns its layout. */
  pos: { x: number; y: number };
  /** JSON Schema for the state this actor needs before it runs (validated by the runtime). */
  input?: Schema;
  /** JSON Schema for the state patch this actor returns (validated by the runtime). */
  output?: Schema;
  /**
   * Which other flows this actor may delegate to – rendered in the canvas as flow nodes
   * with "handoff"/"call" edges. `to: "startable"` = every flow the router may start.
   */
  delegates?: { via: "handoff" | "call"; to: string[] | "startable" }[];
  handle(message: Message, ctx: Context): Promise<Result>;
};

export type Edge = { from: string; to: string; label?: string };

export type Flow = {
  id: string;
  name: string;
  description: string;
  /** Example sentences that start the flow in chat – the router learns intent from them. */
  examples: string[];
  /** System flows (e.g. the router) run for every message and are never started manually. */
  system?: boolean;
  /** Components (leaf skills) are only called by other flows, never directly from chat. */
  component?: boolean;
  /** Actor that receives the start message. */
  start: string;
  actors: Actor[];
  /** Other flows this flow calls – rendered in the canvas as nodes "flow:<id>". */
  refs?: { flow: string; pos: { x: number; y: number } }[];
  /** Edges between actors; source/target may also be "flow:<id>". */
  edges: Edge[];
  /** JSON Schema for the input state a caller must provide (validated on `call`). */
  input?: Schema;
  /** JSON Schema for the final state this flow returns to its caller. */
  output?: Schema;
};

/** JSON Schema of a Result – the runtime validates every actor return value against it. */
export const RESULT_SCHEMA: Schema = {
  type: "object",
  oneOf: [
    { required: ["tell"], properties: { tell: { type: "string", minLength: 1 }, say: { type: "string" }, state: { type: "object" } }, additionalProperties: false },
    { required: ["ask"], properties: { ask: { type: "string", minLength: 1 }, state: { type: "object" } }, additionalProperties: false },
    { required: ["handoff"], properties: { handoff: { type: "string", minLength: 1 }, text: { type: "string" }, state: { type: "object" } }, additionalProperties: false },
    { required: ["call", "then"], properties: { call: { type: "string", minLength: 1 }, then: { type: "string", minLength: 1 }, text: { type: "string" }, input: { type: "object" }, state: { type: "object" } }, additionalProperties: false },
    { required: ["done"], properties: { done: { type: "string" }, state: { type: "object" } }, additionalProperties: false },
    { required: ["cancel"], properties: { cancel: { type: "string" }, state: { type: "object" } }, additionalProperties: false },
  ],
};
