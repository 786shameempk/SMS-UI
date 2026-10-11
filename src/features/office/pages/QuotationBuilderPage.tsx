import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { QuotationForm } from "../components/QuotationForm";
import { createQuotation } from "../api/sales";
import { errorText } from "../helpers";
import type { QuotationRequest } from "../salesTypes";

/** A new quotation: a standard plan as it is, or a custom one by adding modules, quantities and a discount. */
export default function QuotationBuilderPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const school = params.get("school") ?? "";
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: (r: QuotationRequest) => createQuotation(r),
    onSuccess: (q) => {
      toast.success(`Draft ${q.number} saved.`);
      navigate(`/office/quotations/${q.id}`);
    },
    onError: (e) => setError(errorText(e)),
  });
  return (
    <PageContainer>
      <PageHeader icon={Sparkles} title="New quotation" description="Pick a school and a plan, then adjust the term, quantities, add-ons and discount. The server prices it." />
      <QuotationForm
        initial={school ? { schoolId: school, planId: "", contractMonths: 12, students: 500, branches: 1, addons: [], discountKind: null, discountValue: 0, milestones: null, installments: null, removedModules: [], validUntil: null, internalNotes: null, customerTerms: null } : undefined}
        lockSchool={!!school}
        submitLabel="Save draft"
        busy={create.isPending}
        error={error}
        onSubmit={(r) => { setError(null); create.mutate(r); }}
      />
    </PageContainer>
  );
}
