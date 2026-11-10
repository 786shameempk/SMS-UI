import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoScholasticTab from "./CoScholasticTab";
import GenerateTab from "./GenerateTab";
import GradingTab from "./GradingTab";
import IssuesTab from "./IssuesTab";
import TemplatesTab from "./TemplatesTab";
import { useProgressCardAccess } from "./access";

const TABS = ["generate", "published", "coscholastic", "templates", "grading"] as const;

export default function ProgressCardsPage() {
  const { t } = useTranslation("progress-cards");
  const access = useProgressCardAccess();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const allowed = TABS.filter((x) => (x === "templates" || x === "grading" ? access.canManage : x === "generate" || x === "coscholastic" ? access.canGenerate : true));
  const tab = allowed.find((x) => x === requested) ?? allowed[0] ?? "published";

  return (
    <PageContainer>
      <PageHeader
        title={t("Progress Card Generator")}
        description={t("Choose or design a progress card template, set the grading rules, then generate, approve and publish cards from the examination results.")}
      />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <div className="overflow-x-auto"><TabsList variant="line" className="w-max min-w-full">
          {access.canGenerate && <TabsTrigger value="generate">{t("Generate")}</TabsTrigger>}
          <TabsTrigger value="published">{t("Cards and publishing")}</TabsTrigger>
          {access.canGenerate && <TabsTrigger value="coscholastic">{t("Co-scholastic and remarks")}</TabsTrigger>}
          {access.canManage && <TabsTrigger value="templates">{t("Template library")}</TabsTrigger>}
          {access.canManage && <TabsTrigger value="grading">{t("Grading configuration")}</TabsTrigger>}
        </TabsList></div>
        <TabsContent value="generate"><GenerateTab /></TabsContent>
        <TabsContent value="published"><IssuesTab /></TabsContent>
        <TabsContent value="coscholastic"><CoScholasticTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="grading"><GradingTab /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}
