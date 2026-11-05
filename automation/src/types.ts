import type { Article } from "../../src/content/articles";
export interface Env {
  DB: D1Database;
  ADMIN_DISABLED?: string;
  IMAGES_REQUIRED?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
  CRYPTONEWS_API_KEY?: string;
  ECONOFLUX_OPENAI_API_KEY?: string;
  GITHUB_TOKEN?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  SITE_URL: string;
  GITHUB_REPOSITORY: string;
  GITHUB_BRANCH: string;
  PAGES_PROJECT: string;
  AI_MODEL: string;
}
export interface Settings {
  editorialDailyPlan?: boolean;
  reportingPolicy?: number;
  executionMode?: "hourly";
  dailyTarget: number;
  intervalMinutes: number;
  breakingEnabled: boolean;
  extraQuota: number;
  enabled: boolean;
  paused: boolean;
  mode: "test" | "active";
  dailyNewsCalls: number;
  dailyAICalls: number;
  dailyBudgetMicrousd: number;
  dailyBuilds: number;
  maxConcurrent: number;
  minimumGapMinutes: number;
  autoApprove: boolean;
  primaryHosts: string[];
  inputUSDPerMillion: number;
  outputUSDPerMillion: number;
}
export interface Event {
  related_hint?: string | null;
  event_at?: string;
  id: string;
  fingerprint: string;
  title: string;
  url: string;
  detected_at: string;
  state: string;
  urgent: number;
  importance?: number;
  selection_reason: string;
  urgent_reason: string | null;
  canonical_event: string | null;
  related_id: string | null;
  revision: number;
  verification: string | null;
  verified_at: string | null;
  approved_revision: number | null;
  published_at: string | null;
  updated_at: string | null;
  commit_sha: string | null;
  deployment_id: string | null;
  attempts: number;
  retry_at: string | null;
  last_error: string | null;
  category: string;
}
export interface Source {
  origin_links?: string | null;
  id: string;
  event_id: string;
  url: string;
  publisher: string | null;
  published_at: string | null;
  fetched_at: string | null;
  accessible: number;
  primary_source: number;
  independence_group: string | null;
  excerpt: string | null;
  facts: string | null;
  error: string | null;
}
export interface Verification {
  confirmation?: {
    status: "confirmed" | "rumor" | "leak";
    resolution: "pending" | "confirmed" | "denied";
    basis:
      | "primary"
      | "independent_reporting"
      | "on_record_reporting"
      | "attributed_reporting";
    originalReportUrl: string;
    explanation: string;
    confirmedFacts: string[];
    unconfirmedClaims: string[];
    evidence: {
      sourceId: string;
      quote: string;
      originUrl: string;
      originalReporting: boolean;
      onRecord: boolean;
    }[];
  };
  updatesTranslationId?: string | null;
  editorialPlan?: {
    format: "news" | "analysis" | "explainer" | "urgent";
    evidenceDepth: "limited" | "substantial";
    en: {
      primaryKeyword: string;
      relatedQueries: string[];
      searchIntent: string;
      readerQuestions: string[];
      relatedTranslationIds: string[];
    };
    es: {
      primaryKeyword: string;
      relatedQueries: string[];
      searchIntent: string;
      readerQuestions: string[];
      relatedTranslationIds: string[];
    };
  };
  sufficient: boolean;
  reason: string;
  essentialFacts: string[];
  eventDate: string;
  primaryUrls: string[];
  independentGroups: string[];
  highRisk: boolean;
  urgency: { confirmed: boolean; reason: string };
  canonicalEvent: string;
  category: "bitcoin" | "ethereum" | "defi" | "altcoins";
  sourceIds: string[];
  relevanceScore?: number;
  importanceReason?: string;
  materialUpdate?: boolean;
  draftReview?: { fingerprint: string; passed: boolean; checkedAt: string };
}
export type PreparedArticle = Article & {
  editorialRevision: number;
  seoTitle: string;
  seoDescription: string;
};
export class SafeError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryAfterSeconds = 0,
  ) {
    super(message);
  }
}
