import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesTab from "../components/RolesTab";
import PermissionMatrixTab from "../components/PermissionMatrixTab";
import PoliciesTab from "../components/PoliciesTab";
import FeatureTogglesTab from "../components/FeatureTogglesTab";
import AiPermissionsTab from "../components/AiPermissionsTab";
import StaffActionsTab from "../components/StaffActionsTab";
import SubMenusTab from "../components/SubMenusTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function RolePermissionManagementPage() {
  const { t } = useTranslation("administration");
  return (
    <PageContainer>
      <PageHeader
        title={t("Roles & permissions")}
        description={t("Manage roles, fine-grained permissions, attribute-based policies, and feature availability.")}
      />

      <Tabs defaultValue="roles">
        <TabsList variant="line">
          <TabsTrigger value="roles">{t("Roles")}</TabsTrigger>
          <TabsTrigger value="matrix">{t("Permission matrix")}</TabsTrigger>
          <TabsTrigger value="policies">{t("Policies")}</TabsTrigger>
          <TabsTrigger value="staff">{t("Staff actions")}</TabsTrigger>
          <TabsTrigger value="submenus">{t("Sub-menus")}</TabsTrigger>
          <TabsTrigger value="ai">{t("AI permissions")}</TabsTrigger>
          <TabsTrigger value="features">{t("Feature toggles")}</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
        <TabsContent value="matrix">
          <PermissionMatrixTab />
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="staff">
          <StaffActionsTab />
        </TabsContent>
        <TabsContent value="submenus">
          <SubMenusTab />
        </TabsContent>
        <TabsContent value="ai">
          <AiPermissionsTab />
        </TabsContent>
        <TabsContent value="features">
          <FeatureTogglesTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
