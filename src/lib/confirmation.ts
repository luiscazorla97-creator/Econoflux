import type { Lang } from "./i18n";
export type ConfirmationStatus = "confirmed" | "rumor" | "leak";
export interface Confirmation {
  status: ConfirmationStatus;
  resolution: "pending" | "confirmed" | "denied";
  checkedAt: string;
  explanation: string;
  confirmedFacts: string[];
  unconfirmedClaims: string[];
  originalReport: { label: string; url: string };
  initialReport?: { label: string; url: string };
  originStatus?: ConfirmationStatus;
}
export const reportingUrl = (lang: Lang) =>
  lang === "en" ? "/en/rumors-and-leaks/" : "/es/rumores-y-filtraciones/";
export function confirmationLabel(c: Confirmation | undefined, lang: Lang) {
  if (c?.resolution === "denied")
    return lang === "en" ? "DENIED REPORT" : "REPORTE DESMENTIDO";
  return {
    confirmed: lang === "en" ? "CONFIRMED" : "CONFIRMADA",
    rumor: "RUMOR",
    leak: lang === "en" ? "LEAK" : "FILTRACIÓN",
  }[c?.status || "confirmed"];
}
export const isReported = (c?: Confirmation) =>
  !!c &&
  (c.status !== "confirmed" ||
    (!!c.originStatus && c.originStatus !== "confirmed"));
