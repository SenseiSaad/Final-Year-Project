import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "smol-toml";

/*
  Product facts come from the project's own config.toml when present,
  with matching fallback defaults so isolated Vercel builds of web/ never fail.
*/
type Config = {
  uploads?: { max_file_mb?: number; max_docs_per_user?: number; allowed_extensions?: string[] };
  auth?: { max_failed_logins?: number; lockout_minutes?: number };
  rag?: {
    top_k?: number;
    bm25_weight?: number;
    vector_weight?: number;
    min_score?: number;
    okf_boost?: number;
    okf_max_docs?: number;
  };
  legal?: { operator_name?: string; contact_email?: string; country?: string; effective_date?: string };
};

function loadTomlConfig(): Config {
  const candidates = [
    path.join(process.cwd(), "..", "config.toml"),
    path.join(process.cwd(), "config.toml"),
  ];
  for (const file of candidates) {
    if (existsSync(/*turbopackIgnore: true*/ file)) {
      return parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as unknown as Config;
    }
  }
  return {};
}

const config = loadTomlConfig();

export const facts = {
  maxFileMb: config.uploads?.max_file_mb ?? 10,
  maxFailedLogins: config.auth?.max_failed_logins ?? 5,
  lockoutMinutes: config.auth?.lockout_minutes ?? 15,
  topK: config.rag?.top_k ?? 4,
  keywordWeight: config.rag?.bm25_weight ?? 0.3,
  meaningWeight: config.rag?.vector_weight ?? 0.7,
  minScore: config.rag?.min_score ?? 0.15,
  okfBoost: config.rag?.okf_boost ?? 0.15,
  okfMaxDocs: config.rag?.okf_max_docs ?? 3,
};

export type Facts = typeof facts;

export const legal = {
  operatorName: config.legal?.operator_name ?? "",
  contactEmail: config.legal?.contact_email ?? "",
  country: config.legal?.country ?? "",
  effectiveDate: config.legal?.effective_date ?? "",
};
