const strings = { type: "array", items: { type: "string" } };
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const localized = object({
  primaryKeyword: { type: "string" },
  relatedQueries: strings,
  searchIntent: { type: "string" },
  readerQuestions: strings,
  relatedTranslationIds: strings,
});
export function verificationSchema(
  sources: {
    id: string;
    url: string;
    accessible: number;
    primary_source: number;
    independence_group: string | null;
  }[],
) {
  const available = sources.filter((s) => s.accessible);
  const enumeration = (values: string[]) => ({
    type: "array",
    items: { type: "string", enum: [...new Set(values)] },
  });
  return object({
    sufficient: { type: "boolean" },
    reason: { type: "string" },
    essentialFacts: strings,
    eventDate: { type: "string" },
    primaryUrls: enumeration(
      available.filter((s) => s.primary_source).map((s) => s.url),
    ),
    independentGroups: enumeration(
      available
        .map((s) => s.independence_group)
        .filter((g): g is string => !!g),
    ),
    highRisk: { type: "boolean" },
    urgency: object({
      confirmed: { type: "boolean" },
      reason: { type: "string" },
    }),
    canonicalEvent: { type: "string" },
    category: {
      type: "string",
      enum: ["bitcoin", "ethereum", "defi", "altcoins"],
    },
    sourceIds: enumeration(available.map((s) => s.id)),
    relevanceScore: { type: "integer", minimum: 0, maximum: 100 },
    importanceReason: { type: "string" },
    materialUpdate: { type: "boolean" },
    unknowns: strings,
    editorialPlan: object({
      format: {
        type: "string",
        enum: ["news", "analysis", "explainer", "urgent"],
      },
      evidenceDepth: { type: "string", enum: ["limited", "substantial"] },
      en: localized,
      es: localized,
    }),
  });
}
