import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenerateCertificateTab from "../components/GenerateCertificateTab";
import IssuedCertificatesTab from "../components/IssuedCertificatesTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function CertificatesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Certificate generator"
        description="Generate bonafide, transfer, character, study, achievement, and staff service certificates."
      />

      <Tabs defaultValue="generate">
        <TabsList variant="line">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="issued">Issued Certificates</TabsTrigger>
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
