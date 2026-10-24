import { useTranslation } from "react-i18next";
import BranchesTab from "../components/BranchesTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function BranchManagementPage() {
  const { t } = useTranslation("administration");
  return (
    <PageContainer>
      <PageHeader
        title={t("Branch management")}
        description={t("Manage this school's campuses. Every student, staff member, and record belongs to one branch.")}
      />

      <BranchesTab />
    </PageContainer>
  );
}
