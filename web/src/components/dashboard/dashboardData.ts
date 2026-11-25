export type RoleKey = "admin" | "employee";

export type RoleProfile = {
  key: RoleKey;
  label: string;
  badge: string;
  name: string;
  initials: string;
  department: string;
  summary: string;
};

export const roleProfiles: Record<RoleKey, RoleProfile> = {
  admin: {
    key: "admin",
    label: "Admin",
    badge: "Highest permission",
    name: "Administrator",
    initials: "AD",
    department: "All departments",
    summary: "Full workspace access across documents, OKF pinning, team channels, users and audit logs.",
  },
  employee: {
    key: "employee",
    label: "Employee",
    badge: "Average permission",
    name: "Ayesha Khan",
    initials: "AK",
    department: "Finance",
    summary: "Standard access: sees Finance, company-wide and shared documents only.",
  },
};

export type DocVisibility = "Everyone" | "Department" | "Private" | "Shared";

export type WorkspaceDoc = {
  id: string;
  name: string;
  sizeLabel: string;
  owner: string;
  department: string;
  visibility: DocVisibility;
  chunks: number;
  updated: string;
  employeeAccess: string | null;
  isOkf: boolean;
};

export const initialDocs: WorkspaceDoc[] = [
  {
    id: "doc-okf",
    name: "2026-policy-updates.md",
    sizeLabel: "4 KB",
    owner: "Administrator",
    department: "Company-wide",
    visibility: "Everyone",
    chunks: 2,
    updated: "Today · 08:45",
    employeeAccess: "Everyone",
    isOkf: true,
  },
  {
    id: "doc-1",
    name: "expense-policy.pdf",
    sizeLabel: "420 KB",
    owner: "Usman Tariq",
    department: "Finance",
    visibility: "Department",
    chunks: 9,
    updated: "Today · 09:12",
    employeeAccess: "Department",
    isOkf: false,
  },
  {
    id: "doc-2",
    name: "q3-budget-notes.md",
    sizeLabel: "18 KB",
    owner: "Ayesha Khan",
    department: "Finance",
    visibility: "Private",
    chunks: 5,
    updated: "Yesterday",
    employeeAccess: "Own",
    isOkf: false,
  },
  {
    id: "doc-3",
    name: "leave-policy.pdf",
    sizeLabel: "610 KB",
    owner: "Hina Raza",
    department: "HR",
    visibility: "Everyone",
    chunks: 11,
    updated: "3 days ago",
    employeeAccess: "Everyone",
    isOkf: false,
  },
  {
    id: "doc-4",
    name: "hr-handbook.docx",
    sizeLabel: "1.2 MB",
    owner: "Bilal Ahmed",
    department: "HR",
    visibility: "Department",
    chunks: 18,
    updated: "Last week",
    employeeAccess: null,
    isOkf: false,
  },
  {
    id: "doc-5",
    name: "salary-review-notes.md",
    sizeLabel: "12 KB",
    owner: "Bilal Ahmed",
    department: "HR",
    visibility: "Private",
    chunks: 4,
    updated: "Last week",
    employeeAccess: null,
    isOkf: false,
  },
  {
    id: "doc-6",
    name: "vendor-checklist.txt",
    sizeLabel: "9 KB",
    owner: "Sana Malik",
    department: "Operations",
    visibility: "Department",
    chunks: 6,
    updated: "2 weeks ago",
    employeeAccess: null,
    isOkf: false,
  },
];

export type QaCase = {
  id: string;
  label: string;
  question: string;
  keywords: string[];
  requiredDocId: string | null;
  answerText: string;
  sourceFiles: string[];
  okfDocId?: string;
  okfAnswerText?: string;
  okfSourceFiles?: string[];
  refusal: string;
};

export const qaCases: QaCase[] = [
  {
    id: "leave",
    label: "Leave policy (OKF)",
    question: "How many annual leave days do I get and how many carry over?",
    keywords: ["leave", "carry", "unused", "march", "days", "annual"],
    requiredDocId: "doc-3",
    answerText:
      "You get 15 annual leave days per year and can carry over up to 5 unused days into Q1. Carried days must be taken by 31 March before they lapse.",
    sourceFiles: ["leave-policy.pdf"],
    okfDocId: "doc-okf",
    okfAnswerText:
      "As of January 2026, you get 18 annual leave days per year and can carry over up to 5 unused days until 31 March. Send leave requests to hr-desk@acme.test.",
    okfSourceFiles: ["2026-policy-updates.md", "leave-policy.pdf"],
    refusal: "I could not find this in the documents you are allowed to open.",
  },
  {
    id: "travel",
    label: "Travel (Roman Urdu)",
    question: "Travel expense ke liye approval kab chahiye?",
    keywords: ["travel", "expense", "approval", "pkr", "reimburse", "booking"],
    requiredDocId: "doc-1",
    answerText:
      "PKR 40,000 se zyada ke travel expense ke liye booking se pehle manager ki written approval zaroori hai. Approval ke baghair booking reimburse nahi hogi.",
    sourceFiles: ["expense-policy.pdf"],
    refusal: "I could not find this in the documents you are allowed to open.",
  },
  {
    id: "salary",
    label: "HR salary notes",
    question: "What is the planned Q4 salary review band?",
    keywords: ["salary", "band", "review", "q4", "compensation", "pay"],
    requiredDocId: "doc-5",
    answerText:
      "The Q4 salary review allocates a 6%–8% merit pool for confirmed staff, finalised after department sign-off.",
    sourceFiles: ["salary-review-notes.md"],
    refusal:
      "I could not find this in the documents you can open. Private HR files are excluded before search begins.",
  },
  {
    id: "wifi",
    label: "Not in docs",
    question: "What is the guest Wi-Fi password for floor 3?",
    keywords: ["wifi", "password", "internet", "guest"],
    requiredDocId: null,
    answerText: "",
    sourceFiles: [],
    refusal:
      "I could not find an answer in the documents you are allowed to open, so I will not guess.",
  },
];

export type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  files: string[];
  refused: boolean;
  time: string;
};

export type TeamChannel = {
  id: string;
  name: string;
  scope: string;
  description: string;
  adminOnly?: boolean;
};

export const teamChannels: TeamChannel[] = [
  { id: "general", name: "general", scope: "Everyone", description: "Company announcements and policy updates" },
  { id: "finance", name: "finance", scope: "Finance", description: "Expense approvals, budgets and vendor invoices" },
  { id: "hr-private", name: "hr-private", scope: "HR · Admin", description: "Compensation reviews and leave administration", adminOnly: true },
];

export type TeamMessage = {
  id: string;
  channelId: string;
  author: string;
  initials: string;
  role: string;
  time: string;
  text: string;
  attachment?: string;
};

export const initialTeamMessages: TeamMessage[] = [
  {
    id: "m-1",
    channelId: "general",
    author: "Administrator",
    initials: "AD",
    role: "Admin",
    time: "08:46",
    text: "Pinned 2026-policy-updates.md as OKF so everyone gets the updated 18-day annual leave figure in Chat.",
    attachment: "2026-policy-updates.md",
  },
  {
    id: "m-2",
    channelId: "general",
    author: "Hina Raza",
    initials: "HR",
    role: "HR",
    time: "09:05",
    text: "Reminder: carry-over requests for unused leave close on 15 December.",
  },
  {
    id: "m-3",
    channelId: "finance",
    author: "Usman Tariq",
    initials: "UT",
    role: "Finance",
    time: "09:15",
    text: "Uploaded the revised travel approval limits. Anything above PKR 40,000 requires written sign-off before booking.",
    attachment: "expense-policy.pdf",
  },
  {
    id: "m-4",
    channelId: "finance",
    author: "Ayesha Khan",
    initials: "AK",
    role: "Finance",
    time: "09:28",
    text: "Thanks Usman — confirmed it shows up in Finance search right away.",
  },
  {
    id: "m-5",
    channelId: "hr-private",
    author: "Bilal Ahmed",
    initials: "BA",
    role: "HR",
    time: "10:12",
    text: "Q4 salary review draft is locked to Private visibility until leadership sign-off.",
    attachment: "salary-review-notes.md",
  },
];

export type WorkspaceUser = {
  username: string;
  name: string;
  role: "Admin" | "Employee";
  department: string;
  active: boolean;
};

export const initialUsers: WorkspaceUser[] = [
  { username: "admin", name: "Administrator", role: "Admin", department: "All", active: true },
  { username: "a.khan", name: "Ayesha Khan", role: "Employee", department: "Finance", active: true },
  { username: "b.ahmed", name: "Bilal Ahmed", role: "Employee", department: "HR", active: true },
  { username: "s.malik", name: "Sana Malik", role: "Employee", department: "Operations", active: true },
  { username: "u.farooq", name: "Umar Farooq", role: "Employee", department: "Operations", active: false },
];

export type AuditRow = {
  id: number;
  time: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
};

export const initialAuditRows: AuditRow[] = [
  { id: 1, time: "08:45", actor: "Administrator", action: "OKF pinned", target: "2026-policy-updates.md", detail: "Pinned as official guidance (+0.15 boost)" },
  { id: 2, time: "09:12", actor: "Usman Tariq", action: "File uploaded", target: "expense-policy.pdf", detail: "Finance · 9 chunks indexed" },
  { id: 3, time: "09:20", actor: "Bilal Ahmed", action: "File shared", target: "hr-handbook.docx", detail: "Shared view-only with Sana Malik" },
  { id: 4, time: "10:05", actor: "Ayesha Khan", action: "Question asked", target: "expense-policy.pdf", detail: "Answered in Roman Urdu · 1 source" },
  { id: 5, time: "10:41", actor: "Administrator", action: "User disabled", target: "u.farooq", detail: "Account disabled by administrator" },
];

/* Lightweight deterministic short hash for visual SHA-256 chain demo */
export function chainHash(prev: string, payload: string): string {
  let h1 = 0xdeadbeef ^ prev.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  const text = `${prev}|${payload}`;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")).slice(0, 12);
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
