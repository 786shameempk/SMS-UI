import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenerateCertificateTab from "../components/GenerateCertificateTab";
import IssuedCertificatesTab from "../components/IssuedCertificatesTab";

export default function CertificatesPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Certificate generator</h1>
        <p className="text-sm text-slate-500 mt-1">Generate bonafide, transfer, character, study, achievement, and staff service certificates.</p>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
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
    </div>
  );
}
