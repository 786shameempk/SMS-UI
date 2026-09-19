import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuditLogTab from "../components/AuditLogTab";
import BackupTab from "../components/BackupTab";
import BrandingTab from "../components/BrandingTab";
import LocalizationTab from "../components/LocalizationTab";
import SchoolProfileTab from "../components/SchoolProfileTab";
import TemplatesTab from "../components/TemplatesTab";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings &amp; administration</h1>
        <p className="text-sm text-slate-500 mt-1">
          School profile, branding, localization, system templates, backups, and the audit log.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">School Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="localization">Localization</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="backup">Backup &amp; Restore</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <SchoolProfileTab />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingTab />
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
