import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RolesTab from "../components/RolesTab";
import PermissionMatrixTab from "../components/PermissionMatrixTab";
import PoliciesTab from "../components/PoliciesTab";
import FeatureTogglesTab from "../components/FeatureTogglesTab";

export default function RolePermissionManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Roles &amp; permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage roles, fine-grained permissions, attribute-based policies, and feature availability.
        </p>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
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
    </div>
  );
}
