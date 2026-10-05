import BrandLogo from "@/components/common/BrandLogo";
import { useTenantBranding } from "./TenantProvider";
import { contactLine } from "./printLetterhead";

/** The school's logo, name and contact details at the top of an on-screen document (receipt, payslip, certificate). */
export default function Letterhead() {
  const branding = useTenantBranding();
  const contact = contactLine(branding);
  return (
    <div className="flex flex-col items-center gap-1">
      <BrandLogo className="h-12 w-12" iconClassName="h-6 w-6" />
      <h2 className="text-lg font-bold text-slate-900">{branding.name}</h2>
      {contact && <p className="text-xs text-slate-500">{contact}</p>}
      {branding.address && <p className="text-xs text-slate-500">{branding.address}</p>}
    </div>
  );
}
