import BranchesTab from "../components/BranchesTab";

export default function BranchManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Branch management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage this school's campuses. Every student, staff member, and record belongs to one branch.</p>
      </div>

      <BranchesTab />
    </div>
  );
}
