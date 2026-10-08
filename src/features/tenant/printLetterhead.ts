import type { TenantBranding } from "./branding";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** The "email · phone" line under the school name; empty values are left out, and nothing is shown if both are empty. */
export function contactLine(branding: Pick<TenantBranding, "email" | "contactNumber">): string {
  return [branding.email, branding.contactNumber].filter(Boolean).join(" · ");
}

/** CSS for {@link letterheadHtml}, for documents that open in their own window (outside the app's styles). */
export const LETTERHEAD_CSS =
  ".lh{text-align:center;border-bottom:1px solid #cbd5e1;padding-bottom:10px;margin-bottom:16px}.lh img{max-height:56px;max-width:160px;object-fit:contain;margin-bottom:4px}.lh b{display:block;font-size:18px}.lh span{display:block;color:#64748b;font-size:12px}";

/** The school's letterhead (logo, name, contact details, address) as escaped HTML for printed documents. */
export function letterheadHtml(branding: TenantBranding): string {
  const logo = branding.logoUrl ? `<img src="${escapeHtml(branding.logoUrl)}" alt="">` : "";
  const contact = contactLine(branding);
  return `<div class="lh">${logo}<b>${escapeHtml(branding.name)}</b>${contact ? `<span>${escapeHtml(contact)}</span>` : ""}${
    branding.address ? `<span>${escapeHtml(branding.address)}</span>` : ""
  }</div>`;
}
