import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/authStore";
import AppearanceTab from "../components/AppearanceTab";
import AuditLogTab from "../components/AuditLogTab";
import BackupTab from "../components/BackupTab";
import LocalizationTab from "../components/LocalizationTab";
import SchoolProfileTab from "../components/SchoolProfileTab";
import SubscriptionTab from "../components/SubscriptionTab";
import TemplatesTab from "../components/TemplatesTab";
import WidgetManagementTab from "@/features/dashboard/admin/WidgetManagementTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

const TABS = ["profile", "subscription", "branding", "dashboard", "localization", "templates", "backup", "audit"];

export default function SettingsPage() {
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const { t } = useTranslation("settings");
  // Links such as the subscription banner open a tab directly (?tab=subscription).
  const requested = useSearchParams()[0].get("tab");
  const first = requested && TABS.includes(requested) ? requested : "profile";

  return (
    <PageContainer>
      <PageHeader
        title={t("Settings & administration")}
        description={t("School profile, subscription plan, appearance, dashboard widgets, localization, system templates, backups, and the audit log.")}
      />

      <Tabs defaultValue={first}>
        <TabsList variant="line">
          <TabsTrigger value="profile">{t("School Profile")}</TabsTrigger>
          <TabsTrigger value="subscription">{t("Plan & Subscription")}</TabsTrigger>
          <TabsTrigger value="branding">{t("Appearance")}</TabsTrigger>
          <TabsTrigger value="dashboard">{t("Dashboard")}</TabsTrigger>
          <TabsTrigger value="localization">{t("Localization")}</TabsTrigger>
          <TabsTrigger value="templates">{t("Templates")}</TabsTrigger>
          <TabsTrigger value="backup">{t("Backup & Restore")}</TabsTrigger>
          <TabsTrigger value="audit">{t("Audit Log")}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <SchoolProfileTab />
        </TabsContent>
        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>
        <TabsContent value="branding">
          {/* Remounts on tenant switch: its 3 preset queries sit outside the CSS-variable
              re-apply TenantSwitcher already does, and a fresh mount is the one guaranteed way
              to avoid this tab ever showing a stale selection if it's open during a switch. */}
          <AppearanceTab key={activeTenantId} />
        </TabsContent>
        <TabsContent value="dashboard">
          {/* Remounts on tenant switch so a super admin never edits one school's widgets while viewing another. */}
          <WidgetManagementTab key={activeTenantId} />
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
    </PageContainer>
  );
}
