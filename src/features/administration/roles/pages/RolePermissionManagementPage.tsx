import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesTab from "../components/RolesTab";
import PermissionMatrixTab from "../components/PermissionMatrixTab";
import PoliciesTab from "../components/PoliciesTab";
import FeatureTogglesTab from "../components/FeatureTogglesTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function RolePermissionManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Roles &amp; permissions"
        description="Manage roles, fine-grained permissions, attribute-based policies, and feature availability."
      />

      <Tabs defaultValue="roles">
        <TabsList variant="line">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="features">Feature toggles</TabsTrigger>
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
        <TabsContent value="features">
          <FeatureTogglesTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
