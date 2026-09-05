// JSON Schemas of the HITL component – in their own module so flow.ts and the actor
// can both import them without a circular import.
export const OPTION = {
  type: "object",
  required: ["id", "label"],
  properties: { id: { type: "string", minLength: 1 }, label: { type: "string", minLength: 1 } },
};

export const HITL_INPUT = {
  type: "object",
  required: ["question"],
  properties: {
    question: { type: "string", minLength: 1 },
    options: { type: "array", items: OPTION },
    allowText: { type: "boolean" },
  },
};

export const HITL_OUTPUT = {
  type: "object",
  required: ["decision", "answer"],
  properties: {
    decision: { type: "string", minLength: 1 },
    text: { type: ["string", "null"] },
    answer: { type: "string" },
  },
};
