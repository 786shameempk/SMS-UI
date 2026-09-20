import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import AppearanceTab from "../components/AppearanceTab";
import AuditLogTab from "../components/AuditLogTab";
import BackupTab from "../components/BackupTab";
import LocalizationTab from "../components/LocalizationTab";
import SchoolProfileTab from "../components/SchoolProfileTab";
import TemplatesTab from "../components/TemplatesTab";

export default function SettingsPage() {
  const activeTenantId = useAuthStore((s) => s.activeTenantId);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings &amp; administration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          School profile, appearance, localization, system templates, backups, and the audit log.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">School Profile</TabsTrigger>
          <TabsTrigger value="branding">Appearance</TabsTrigger>
          <TabsTrigger value="localization">Localization</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="backup">Backup &amp; Restore</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <SchoolProfileTab />
        </TabsContent>
        <TabsContent value="branding">
          {/* Remounts on tenant switch: its 3 preset queries sit outside the CSS-variable
              re-apply TenantSwitcher already does, and a fresh mount is the one guaranteed way
              to avoid this tab ever showing a stale selection if it's open during a switch. */}
          <AppearanceTab key={activeTenantId} />
        </TabsContent>
        <TabsContent value="localization">
          <LocalizationTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="backup">
          <BackupTab />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
