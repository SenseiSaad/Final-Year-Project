/*
  Sample workspace used by the interactive previews. Every name, file and
  number here is illustrative and labelled as sample data on the page.
*/

export type Passage = { ref: string; text: string; highlight: string };

export type AskSample = {
  label: string;
  question: string;
  // Answer as text pieces and citation keys, streamed in order
  answer: (string | { cite: string })[];
  meta: string;
  // What each file is, in one line
  files: Record<string, string>;
  sources: Record<string, Passage>;
};

export const askSamples: AskSample[] = [
  {
    label: "English",
    question: "How many unused leave days can I carry into next year?",
    answer: [
      "You can carry over up to 5 unused annual leave days ",
      { cite: "leave-policy.pdf | 3" },
      ". Carried days must be taken by 31 March, otherwise they lapse ",
      { cite: "leave-policy.pdf | 4" },
      ". Submit the request in the HR portal before 15 December ",
      { cite: "hr-handbook.docx | 12" },
      ".",
    ],
    meta: "4 passages from 2 documents you can open · 1.8 s",
    files: {
      "leave-policy.pdf": "The company leave policy: entitlements, carry-over rules and when carried days expire.",
      "hr-handbook.docx": "The HR handbook: how staff submit requests and who approves them.",
    },
    sources: {
      "leave-policy.pdf | 3": {
        ref: "leave-policy.pdf | 3",
        text: "4.2 Carry-over. Employees may carry over up to five (5) unused annual leave days into the first quarter of the following year. Days beyond this limit are not paid out.",
        highlight: "carry over up to five (5) unused annual leave days",
      },
      "leave-policy.pdf | 4": {
        ref: "leave-policy.pdf | 4",
        text: "4.3 Expiry. Carried-over days must be taken by 31 March. Any carried-over days not taken by this date lapse automatically.",
        highlight: "must be taken by 31 March",
      },
      "hr-handbook.docx | 12": {
        ref: "hr-handbook.docx | 12",
        text: "Carry-over requests are submitted through the HR portal and must be approved by the line manager no later than 15 December.",
        highlight: "submitted through the HR portal",
      },
    },
  },
  {
    label: "Roman Urdu",
    question: "Travel expense ke liye approval kab chahiye?",
    answer: [
      "PKR 40,000 se zyada ke travel expense ke liye booking se pehle manager ki approval zaroori hai ",
      { cite: "expense-policy.pdf | 2" },
      ". Approval ke baghair ki gayi booking reimburse nahi hogi ",
      { cite: "expense-policy.pdf | 5" },
      ".",
    ],
    meta: "3 passages from 1 document you can open · 2.1 s",
    files: {
      "expense-policy.pdf": "The expense policy: what can be claimed, which approvals are needed and when claims are refused.",
    },
    sources: {
      "expense-policy.pdf | 2": {
        ref: "expense-policy.pdf | 2",
        text: "2.1 Pre-approval. Any travel expense above PKR 40,000 requires written approval from the line manager before booking.",
        highlight: "above PKR 40,000 requires written approval",
      },
      "expense-policy.pdf | 5": {
        ref: "expense-policy.pdf | 5",
        text: "2.4 Bookings made without the required pre-approval are not eligible for reimbursement.",
        highlight: "not eligible for reimbursement",
      },
    },
  },
];

export type RankedPassage = { ref: string; snippet: string; keyword: number; meaning: number };

// keyword and meaning are raw 0–1 scores; the page applies the configured weights
export const searchSamples: { label: string; query: string; rows: RankedPassage[] }[] = [
  {
    label: "Carry over leave",
    query: "How many unused leave days can I carry into next year?",
    rows: [
      { ref: "leave-policy.pdf | 3", snippet: "Employees may carry over up to five (5) unused annual leave days…", keyword: 0.86, meaning: 0.91 },
      { ref: "leave-policy.pdf | 4", snippet: "Carried-over days must be taken by 31 March…", keyword: 0.52, meaning: 0.78 },
      { ref: "hr-handbook.docx | 12", snippet: "Carry-over requests are submitted through the HR portal…", keyword: 0.61, meaning: 0.66 },
      { ref: "hr-handbook.docx | 7", snippet: "Annual leave accrues at 1.75 days per completed month…", keyword: 0.34, meaning: 0.49 },
      { ref: "remote-work.md | 2", snippet: "Remote days do not count against annual leave…", keyword: 0.08, meaning: 0.16 },
    ],
  },
  {
    label: "Travel approval",
    query: "When do I need approval for travel expenses?",
    rows: [
      { ref: "expense-policy.pdf | 2", snippet: "Any travel expense above PKR 40,000 requires written approval…", keyword: 0.79, meaning: 0.88 },
      { ref: "expense-policy.pdf | 5", snippet: "Bookings made without the required pre-approval are not eligible…", keyword: 0.58, meaning: 0.74 },
      { ref: "expense-policy.pdf | 1", snippet: "This policy covers travel, meals and accommodation for staff…", keyword: 0.41, meaning: 0.52 },
      { ref: "vendor-checklist.txt | 3", snippet: "Confirm vendor bank details by phone before the first payment…", keyword: 0.12, meaning: 0.31 },
      { ref: "leave-policy.pdf | 9", snippet: "Leave taken while travelling for work is recorded separately…", keyword: 0.1, meaning: 0.12 },
    ],
  },
];

export const refuseSamples = [
  {
    label: "In the documents",
    question: "Can I work from home on Fridays?",
    answered: true,
    score: 0.71,
    answer: [
      "Yes. You can work remotely up to two days a week, Fridays included, with your manager's agreement ",
      { cite: "remote-work.md | 1" },
      ".",
    ] as (string | { cite: string })[],
  },
  {
    label: "Not in the documents",
    question: "What is the CEO's salary this year?",
    answered: false,
    score: 0.06,
    answer: [
      "I could not find this in the documents you can open, so I will not guess. Try asking HR, or check whether the right document has been shared with you.",
    ] as (string | { cite: string })[],
  },
];

export type Doc = { name: string; owner: string; department: string };
export type Access = "Own" | "Department" | "Shared" | null;

export const docs: Doc[] = [
  { name: "expense-policy.pdf", owner: "Usman Tariq", department: "Finance" },
  { name: "q3-budget-notes.md", owner: "Ayesha Khan", department: "Finance · private" },
  { name: "leave-policy.pdf", owner: "Hina Raza", department: "HR" },
  { name: "hr-handbook.docx", owner: "Bilal Ahmed", department: "HR" },
  { name: "salary-review-notes.md", owner: "Bilal Ahmed", department: "HR · private" },
  { name: "vendor-checklist.txt", owner: "Sana Malik", department: "Operations" },
];

export const people: { label: string; access: Access[] }[] = [
  { label: "Ayesha · Finance", access: ["Department", "Own", null, null, null, null] },
  { label: "Bilal · HR", access: [null, null, "Department", "Own", "Own", null] },
  { label: "Sana · Operations", access: [null, null, null, "Shared", null, "Own"] },
];

export const ledgerEntries = [
  { time: "09:12", actor: "Ayesha Khan", action: "uploaded expense-policy.pdf" },
  { time: "09:20", actor: "Bilal Ahmed", action: "shared hr-handbook.docx with Sana Malik" },
  { time: "10:05", actor: "Sana Malik", action: "asked a question, 2 sources cited" },
  { time: "10:41", actor: "Administrator", action: "disabled the account u.farooq" },
  { time: "11:03", actor: "Bilal Ahmed", action: "revoked Sana Malik's access to hr-handbook.docx" },
];

export const tamperedAction = "asked a question, 0 sources cited";
