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
    summary: "Full workspace access across documents, OKF pinning, users, attendance and audit verification.",
  },
  employee: {
    key: "employee",
    label: "Employee",
    badge: "Average permission",
    name: "Ayesha Khan",
    initials: "AK",
    department: "Finance",
    summary: "Standard access: sees only Finance, company-wide and explicitly shared documents.",
  },
};

export type WorkspaceDoc = {
  id: string;
  name: string;
  owner: string;
  department: string;
  visibility: "Everyone" | "Department" | "Private" | "Shared";
  chunks: number;
  updated: string;
  employeeAccess: string | null;
  isOkf: boolean;
};

export const initialDocs: WorkspaceDoc[] = [
  {
    id: "doc-okf",
    name: "2026-policy-updates.md",
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

export type WorkspaceUser = {
  username: string;
  name: string;
  role: "Admin" | "Employee";
  department: string;
  active: boolean;
  present: number;
  absent: number;
  excused: number;
  strikes: number;
};

export const initialUsers: WorkspaceUser[] = [
  { username: "admin", name: "Administrator", role: "Admin", department: "All", active: true, present: 16, absent: 0, excused: 0, strikes: 0 },
  { username: "a.khan", name: "Ayesha Khan", role: "Employee", department: "Finance", active: true, present: 15, absent: 1, excused: 0, strikes: 0 },
  { username: "b.ahmed", name: "Bilal Ahmed", role: "Employee", department: "HR", active: true, present: 14, absent: 1, excused: 1, strikes: 0 },
  { username: "s.malik", name: "Sana Malik", role: "Employee", department: "Operations", active: true, present: 12, absent: 3, excused: 1, strikes: 1 },
  { username: "u.farooq", name: "Umar Farooq", role: "Employee", department: "Operations", active: false, present: 9, absent: 6, excused: 0, strikes: 2 },
];

export const DAILY_ATTENDANCE_CODE = "482917";
