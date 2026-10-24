import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenerateCertificateTab from "../components/GenerateCertificateTab";
import IssuedCertificatesTab from "../components/IssuedCertificatesTab";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { useTranslation } from "react-i18next";

export default function CertificatesPage() {
  const { t } = useTranslation("certificates");
  return (
    <PageContainer>
      <PageHeader
        title={t("Certificate generator")}
        description={t("Generate bonafide, transfer, character, study, achievement, and staff service certificates.")}
      />

      <Tabs defaultValue="generate">
        <TabsList variant="line">
          <TabsTrigger value="generate">{t("Generate")}</TabsTrigger>
          <TabsTrigger value="issued">{t("Issued Certificates")}</TabsTrigger>
        </TabsList>
        <TabsContent value="generate">
          <GenerateCertificateTab />
        </TabsContent>
        <TabsContent value="issued">
          <IssuedCertificatesTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
