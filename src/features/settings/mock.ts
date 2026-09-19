import type { AuditLogEntry, SystemTemplate } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

export const SEED_SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    id: "systpl-1",
    key: "welcome_email",
    name: "Welcome email",
    channel: "email",
    subject: "Welcome to {{schoolName}}",
    body: "Dear {{recipientName}}, welcome to {{schoolName}}! Your account has been created. Please sign in and complete your profile.",
    variables: ["schoolName", "recipientName"],
  },
  {
    id: "systpl-2",
    key: "password_reset",
    name: "Password reset",
    channel: "email",
    subject: "Reset your password",
    body: "Hi {{recipientName}}, we received a request to reset your password. Use the link sent to your registered email to set a new one. If you didn't request this, you can ignore this message.",
    variables: ["recipientName"],
  },
  {
    id: "systpl-3",
    key: "fee_receipt",
    name: "Fee payment receipt",
    channel: "email",
    subject: "Payment receipt — {{receiptNumber}}",
    body: "Dear parent, we've received a payment of {{amount}} for {{studentName}} ({{receiptNumber}}). Thank you.",
    variables: ["receiptNumber", "amount", "studentName"],
  },
  {
    id: "systpl-4",
    key: "admission_confirmation",
    name: "Admission confirmation",
    channel: "sms",
    body: "{{schoolName}}: Admission confirmed for {{applicantName}} into {{appliedClass}}. Please visit the office to complete enrollment.",
    variables: ["schoolName", "applicantName", "appliedClass"],
  },
];

export const SEED_AUDIT_LOG: AuditLogEntry[] = [
  { id: "aud-1", actor: "Ava Whitfield", action: "created a new academic year", category: "settings", detail: "2026-2027", createdAt: daysAgo(21) },
  { id: "aud-2", actor: "Ava Whitfield", action: "updated the fee structure", category: "data", detail: "Term 2 Tuition Fee", createdAt: daysAgo(14) },
  { id: "aud-3", actor: "Rohan Kulkarni", action: "recorded a fee payment", category: "data", detail: "₹58,000 from Priya Nair", createdAt: daysAgo(9) },
  { id: "aud-4", actor: "Ava Whitfield", action: "locked a user account", category: "security", detail: "3 failed login attempts", createdAt: daysAgo(6) },
  { id: "aud-5", actor: "Meera Iyer", action: "published an exam schedule", category: "data", detail: "Final Examination", createdAt: daysAgo(4) },
  { id: "aud-6", actor: "Ava Whitfield", action: "created a new role", category: "user", detail: "Front Desk", createdAt: hoursAgo(30) },
  { id: "aud-7", actor: "System", action: "ran a scheduled maintenance check", category: "system", createdAt: hoursAgo(18) },
  { id: "aud-8", actor: "Ava Whitfield", action: "updated school profile details", category: "settings", createdAt: hoursAgo(3) },
];
