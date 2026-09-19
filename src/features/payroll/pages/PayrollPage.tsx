import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayrollRunsTab from "../components/PayrollRunsTab";
import PayslipsTab from "../components/PayslipsTab";

export default function PayrollPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
        <p className="text-sm text-slate-500 mt-1">Run monthly payroll for staff, then track and pay out individual payslips.</p>
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
        </TabsList>
        <TabsContent value="runs">
          <PayrollRunsTab />
        </TabsContent>
        <TabsContent value="payslips">
          <PayslipsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
