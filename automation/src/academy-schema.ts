const text = { type: "string" };
const strings = { type: "array", items: text };
/** Enforce the editorial format at generation time; no paid prose is discarded
 * because a model chose an alternate property name or an empty table section. */
export const guideDraftSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: text,
    summary: text,
    seoTitle: text,
    seoDescription: text,
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: text,
          title: text,
          text: { ...strings, minItems: 1 },
          subheading: { type: ["string", "null"] },
          list: { type: ["array", "null"], items: text },
          table: {
            type: ["object", "null"],
            additionalProperties: false,
            properties: {
              headings: strings,
              rows: { type: "array", items: strings },
            },
            required: ["headings", "rows"],
          },
        },
        required: ["id", "title", "text", "subheading", "list", "table"],
      },
    },
  },
  required: ["title", "summary", "seoTitle", "seoDescription", "sections"],
};
