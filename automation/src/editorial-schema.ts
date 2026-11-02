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
    origin_links?: string | null;
  }[],
  knownIds: string[] = [],
  reporting = false,
) {
  const available = sources.filter((s) => s.accessible);
  const enumeration = (values: string[]) =>
    values.length
      ? {
          type: "array",
          items: { type: "string", enum: [...new Set(values)] },
        }
      : { type: "array", items: { type: "string" }, maxItems: 0 };
  const urls = [
    ...new Set(
      available.flatMap((s) => [s.url, ...JSON.parse(s.origin_links || "[]")]),
    ),
  ];
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
    ...(reporting
      ? {
          updatesTranslationId: {
            type: ["string", "null"],
            enum: [null, ...knownIds],
          },
          confirmation: object({
            status: { type: "string", enum: ["confirmed", "rumor", "leak"] },
            resolution: {
              type: "string",
              enum: ["pending", "confirmed", "denied"],
            },
            basis: {
              type: "string",
              enum: [
                "primary",
                "independent_reporting",
                "on_record_reporting",
                "attributed_reporting",
              ],
            },
            originalReportUrl: {
              type: "string",
              enum: available.map((s) => s.url),
            },
            explanation: { type: "string" },
            confirmedFacts: strings,
            unconfirmedClaims: strings,
            evidence: {
              type: "array",
              items: object({
                sourceId: { type: "string", enum: available.map((s) => s.id) },
                quote: { type: "string" },
                originUrl: { type: "string", enum: urls },
                originalReporting: { type: "boolean" },
                onRecord: { type: "boolean" },
              }),
            },
          }),
        }
      : {}),
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
