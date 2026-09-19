import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Role } from "@/features/administration/roles/types";
import { updateUserAvatar, updateUserPreferences } from "../api";
import type { SystemUser, UserPreferences } from "../types";
import UserStatusBadge from "./UserStatusBadge";
import SecurityTab from "./SecurityTab";
import SessionsTab from "./SessionsTab";

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function UserProfileDialog({
  user,
  roles,
  open,
  onOpenChange,
}: {
  user: SystemUser | null;
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const avatarMutation = useMutation({
    mutationFn: ({ id, avatarUrl }: { id: string; avatarUrl: string | null }) => updateUserAvatar(id, avatarUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Profile picture updated");
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: ({ id, preferences }: { id: string; preferences: UserPreferences }) => updateUserPreferences(id, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Preferences saved");
    },
  });

  if (!user) return null;

  const roleName = roles.find((r) => r.id === user.roleId)?.name ?? "—";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await avatarMutation.mutateAsync({ id: user.id, avatarUrl: dataUrl });
    } catch {
      toast.error("Could not read that image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    preferencesMutation.mutate({ id: user.id, preferences: { ...user.preferences, [key]: value } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>User profile</DialogTitle>
          <DialogDescription>View account details, security, and manage preferences.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback className="text-base">{initialsOf(user.name)}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
                  aria-label="Change profile picture"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                <div className="mt-1.5">
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Role</dt>
                <dd className="text-slate-800 font-medium">{roleName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Department</dt>
                <dd className="text-slate-800 font-medium">{user.department || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Phone</dt>
                <dd className="text-slate-800 font-medium">{user.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Last login</dt>
                <dd className="text-slate-800 font-medium">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                </dd>
              </div>
            </dl>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-5">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select value={user.preferences.theme} onValueChange={(v) => updatePreference("theme", v as UserPreferences["theme"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                value={user.preferences.language}
                onValueChange={(v) => updatePreference("language", v as UserPreferences["language"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Email notifications</p>
                <p className="text-xs text-slate-500">Receive account and academic updates by email.</p>
              </div>
              <Switch
                checked={user.preferences.emailNotifications}
                onCheckedChange={(v) => updatePreference("emailNotifications", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">SMS notifications</p>
                <p className="text-xs text-slate-500">Receive urgent alerts by SMS.</p>
              </div>
              <Switch
                checked={user.preferences.smsNotifications}
                onCheckedChange={(v) => updatePreference("smsNotifications", v)}
              />
            </div>
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab user={user} />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionsTab user={user} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
