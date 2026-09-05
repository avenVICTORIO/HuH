// Actor "understand" (AI): extracts date, from and to from the message.
// Asks back for whatever is missing – the answer lands in its inbox again.
// A `hint` from another actor (e.g. validate) becomes exactly one question here,
// so the person never gets two messages in a row. Gives up after 3 fruitless asks.
import type { Actor, Schema } from "../../types";

type Extract = { date: string | null; from: string | null; to: string | null; question?: string | null; cancel: boolean };

const DATE = { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const TIME = { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}$" };

const EXTRACT: Schema = {
  type: "object",
  required: ["date", "from", "to", "cancel"],
  properties: { date: DATE, from: TIME, to: TIME, question: { type: ["string", "null"] }, cancel: { type: "boolean" } },
  additionalProperties: false,
};

const WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MAX_ASKS = 3;

const actor: Actor = {
  id: "understand",
  name: "Verstehen",
  kind: "ai",
  description: "Liest Datum, Beginn und Ende aus der Nachricht; fragt genau einmal nach, was fehlt; erkennt einen Abbruchwunsch.",
  pos: { x: 40, y: 120 },
  output: {
    type: "object",
    properties: {
      time: { type: "object", properties: { date: DATE, from: TIME, to: TIME } },
      correction: { type: ["string", "null"] },
      hint: { type: ["string", "null"] },
      asks: { type: "integer", minimum: 0 },
    },
  },
  async handle(message, ctx) {
    if (!ctx.ai.active) return { cancel: "Die KI ist gerade nicht verfügbar – bitte trag die Zeit über „Meine Zeiten“ nach oder sag der Leitung Bescheid." };
    const asks = Number(ctx.state.asks ?? 0);
    const giveUp = () => ({ cancel: "Ich komme hier nicht weiter – trag die Zeit bitte unter „Meine Zeiten“ nach oder sag der Leitung kurz Bescheid." });

    // A hint from validate/decide: ask exactly that, once.
    if (message.kind === "tell" && ctx.state.hint) {
      if (asks >= MAX_ASKS) return giveUp();
      return { ask: String(ctx.state.hint), state: { hint: null, asks: asks + 1 } };
    }

    const known = (ctx.state.time as Partial<Extract> | undefined) ?? {};
    const text = message.kind === "tell" ? String(ctx.state.correction ?? "") : message.kind === "return" ? "" : message.text;
    const today = new Date(ctx.today + "T12:00:00");
    const now = new Date();
    const system = [
      `Du extrahierst Arbeitszeiten aus Chat-Nachrichten eines Restaurant-Teams. Heute ist ${WD[today.getDay()]}, der ${ctx.today}, jetzt ist ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} Uhr.`,
      'Antworte NUR mit JSON: {"date":"YYYY-MM-DD"|null,"from":"HH:MM"|null,"to":"HH:MM"|null,"question":string|null,"cancel":boolean}.',
      "Relative Angaben (gestern, vorgestern, Montag, letzten Freitag) in ein konkretes Datum heute oder in der Vergangenheit umrechnen; „4.9.“ = 4. September des aktuellen Jahres.",
      `Uhrzeiten 24h; „halb fünf“ = 16:30 am Nachmittag, wenn es um Gastro-Schichten geht. Bereits bekannt: ${JSON.stringify(known)} –`,
      'nur überschreiben, wenn die Nachricht etwas Neues dazu sagt. Fehlt etwas, formuliere in "question" eine kurze, freundliche Frage (per Du)',
      'nach genau dem, was fehlt. cancel = true, wenn die Person nicht mehr eintragen möchte (z. B. „vergiss es“, „lass gut sein“, „stopp“).',
    ].join(" ");
    const got = await ctx.ai.json<Extract>(system, text || "(keine neue Angabe)", EXTRACT);
    if (got.cancel) return { cancel: "Alles klar, ich trage nichts ein." };

    const time = { date: got.date ?? known.date ?? null, from: got.from ?? known.from ?? null, to: got.to ?? known.to ?? null };
    const missing = [!time.date && "das Datum", !time.from && "den Beginn", !time.to && "das Ende"].filter(Boolean) as string[];
    if (missing.length) {
      if (asks >= MAX_ASKS) return giveUp();
      const question = got.question?.trim() || `Für welchen Tag und von wann bis wann? Mir fehlt noch ${missing.join(" und ")}.`;
      return { ask: question, state: { time, correction: null, asks: asks + 1 } };
    }
    return { tell: "validate", state: { time, correction: null } };
  },
};

export default actor;
