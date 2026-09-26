import BranchesTab from "../components/BranchesTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function BranchManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Branch management"
        description="Manage this school's campuses. Every student, staff member, and record belongs to one branch."
      />

      <BranchesTab />
    </PageContainer>
  );
}
