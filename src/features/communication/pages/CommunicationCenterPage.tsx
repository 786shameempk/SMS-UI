import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComposeTab from "../components/ComposeTab";
import GroupsTab from "../components/GroupsTab";
import HistoryTab from "../components/HistoryTab";
import TemplatesTab from "../components/TemplatesTab";
import UsageTab from "../components/UsageTab";
import MessagingSettingsTab from "../components/MessagingSettingsTab";
import { useAuthStore } from "@/store/authStore";
import { PageContainer, PageHeader } from "@/components/ui/page";

import { useTranslation } from "react-i18next";
export default function CommunicationCenterPage() {
  const { t } = useTranslation("communication");
  // Provider credentials are for school administrators (EngagementService ManageMessaging policy).
  const role = useAuthStore((s) => s.user?.role);
  const canConfigure = role === "admin" || role === "superAdmin";
  return (
    <PageContainer>
      <PageHeader
        title={t("Communication center")}
        description={t("Send email, SMS, WhatsApp, push and in-app messages through your school's providers, manage templates and groups, and track every delivery.")}
      />

      <Tabs defaultValue="compose">
        <TabsList variant="line">
          <TabsTrigger value="compose">{t("Compose")}</TabsTrigger>
          <TabsTrigger value="templates">{t("Templates")}</TabsTrigger>
          <TabsTrigger value="groups">{t("Groups")}</TabsTrigger>
          <TabsTrigger value="history">{t("History")}</TabsTrigger>
          <TabsTrigger value="usage">{t("Usage")}</TabsTrigger>
          {canConfigure && <TabsTrigger value="settings">{t("Settings")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="compose">
          <ComposeTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab />
        </TabsContent>
        {canConfigure && (
          <TabsContent value="settings">
            <MessagingSettingsTab />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
