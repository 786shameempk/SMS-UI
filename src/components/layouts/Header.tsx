import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Globe, LogOut, Settings, User } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listTenants } from "@/features/platform/api";
import { listBranches } from "@/features/administration/branches/api";
import NotificationBell from "@/features/notifications/components/NotificationBell";

function TenantSwitcher() {
  const queryClient = useQueryClient();
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const setActiveTenantId = useAuthStore((s) => s.setActiveTenantId);
  const { data: tenants = [] } = useQuery({ queryKey: ["platform", "tenants"], queryFn: listTenants });

  return (
    <Select
      value={activeTenantId}
      onValueChange={(id) => {
        if (id === activeTenantId) return;
        setActiveTenantId(id);
        // A hard cache clear (not invalidate) is deliberate: this is a tenant isolation boundary,
        // and invalidate would leave the previous tenant's data rendered during the background
        // refetch — exactly the cross-tenant flash this switch must never produce.
        queryClient.clear();
      }}
    >
      <SelectTrigger className="w-56 h-9">
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Select a tenant" />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.schoolName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BranchSwitcher() {
  const queryClient = useQueryClient();
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveBranchId = useAuthStore((s) => s.setActiveBranchId);
  const { data: branches = [] } = useQuery({ queryKey: ["admin", "branches", activeTenantId], queryFn: listBranches });

  return (
    <Select
      value={activeBranchId}
      onValueChange={(id) => {
        if (id === activeBranchId) return;
        setActiveBranchId(id);
        // Same hard cache clear as TenantSwitcher, for the same reason: this is a branch
        // isolation boundary, and invalidate would flash the previous branch's data on screen
        // during the background refetch.
        queryClient.clear();
      }}
    >
      <SelectTrigger className="w-48 h-9">
        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Select a branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function initialsOf(name: string | undefined | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-4 px-6 border-b border-slate-200/80 bg-white/70 backdrop-blur-md shrink-0">
      <div className="flex-1 min-w-0" />

      {user?.role === "superAdmin" && <TenantSwitcher />}
      {(user?.role === "admin" || user?.role === "superAdmin") && <BranchSwitcher />}

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {initialsOf(user?.name)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-700 leading-tight">{user?.name ?? "User"}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="px-3 py-3 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                {initialsOf(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name ?? "User"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email ?? ""}</p>
              </div>
            </div>
          </div>
          <DropdownMenuItem className="gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-500" />
            </div>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5" onClick={() => navigate("/account/security")}>
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-slate-500" />
            </div>
            Security settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2.5 text-red-600 focus:bg-red-50 focus:text-red-700">
            <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center">
              <LogOut className="w-3.5 h-3.5 text-red-500" />
            </div>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
