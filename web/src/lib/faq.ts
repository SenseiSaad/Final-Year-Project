import type { Facts } from "@/lib/facts";

/* Shared by the FAQ section and the search bar. Answers quote the limits the workspace really enforces. */
export const FAQ: { q: string; a: (f: Facts) => string }[] = [
  {
    q: "Which models answer my questions?",
    a: () =>
      "Local uses Ollama on the workspace server, so nothing goes to a cloud provider. Gemini and Hosted (any OpenAI-compatible service) are cloud providers: your question and the retrieved passages are sent to them. A provider that is not configured on the server says so instead of failing silently, and the workspace asks you to confirm before switching to a cloud model.",
  },
  {
    q: "What if the documents do not contain the answer?",
    a: () =>
      "You get a refusal that says no permitted source matched. The model is not asked to guess, and the attempt is still recorded in the audit log.",
  },
  {
    q: "Which files can I upload?",
    a: (f) =>
      `PDF, Word (.docx), Markdown and plain text, up to ${f.maxFileMb} MB each. PDFs need a text layer; scanned pages are not read because OCR is not included.`,
  },
  {
    q: "Who can read an uploaded file?",
    a: () =>
      "Either a role-based policy (the document's department and the managers assigned to it) or an admin-defined scope that names specific roles, departments and people. Finance and HR never see each other's files unless an admin explicitly grants it.",
  },
  {
    q: "How trustworthy is the audit log?",
    a: () =>
      "Each entry stores the SHA-256 of its contents and of the entry before it, and the server can recompute the whole chain on demand. That reveals edits made afterwards. It is not stored outside the database, so someone with full database access could rewrite it.",
  },
  {
    q: "Is this safe for real company documents?",
    a: () =>
      "No. Sign-in is open in this demo and everyone enters as an administrator. Use it with synthetic documents to evaluate the workflow, not to store confidential data.",
  },
];
