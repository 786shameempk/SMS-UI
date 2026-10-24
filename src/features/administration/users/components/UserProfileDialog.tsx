import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import UserStudentsTab from "./UserStudentsTab";

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
  const { t } = useTranslation("administration");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const avatarMutation = useMutation({
    mutationFn: ({ id, avatarUrl }: { id: string; avatarUrl: string | null }) => updateUserAvatar(id, avatarUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(t("Profile picture updated"));
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: ({ id, preferences }: { id: string; preferences: UserPreferences }) => updateUserPreferences(id, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(t("Preferences saved"));
    },
  });

  if (!user) return null;

  const role = roles.find((r) => r.id === user.roleId);
  const roleName = role?.name ?? "—";
  const isParent = role?.key === "parent";
  const showStudents = isParent;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("Please choose an image file"));
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
      toast.error(t("Could not read that image"));
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
          <DialogTitle>{t("User profile")}</DialogTitle>
          <DialogDescription>{t("View account details, security, and manage preferences.")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">{t("Profile")}</TabsTrigger>
            {showStudents && <TabsTrigger value="students">{t("Students")}</TabsTrigger>}
            <TabsTrigger value="preferences">{t("Preferences")}</TabsTrigger>
            <TabsTrigger value="security">{t("Security")}</TabsTrigger>
            <TabsTrigger value="sessions">{t("Sessions")}</TabsTrigger>
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
                  className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-60"
                  aria-label={t("Change profile picture")}
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="mt-1.5">
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t("Role")}</dt>
                <dd className="text-foreground font-medium">{roleName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Department")}</dt>
                <dd className="text-foreground font-medium">{user.department || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Phone")}</dt>
                <dd className="text-foreground font-medium">{user.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("Last login")}</dt>
                <dd className="text-foreground font-medium">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : t("Never")}
                </dd>
              </div>
            </dl>
          </TabsContent>

          {showStudents && (
            <TabsContent value="students">
              <UserStudentsTab userId={user.id} isParent={isParent} />
            </TabsContent>
          )}

          <TabsContent value="preferences" className="space-y-5">
            <div className="space-y-1.5">
              <Label>{t("Theme")}</Label>
              <Select value={user.preferences.theme} onValueChange={(v) => updatePreference("theme", v as UserPreferences["theme"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("Light")}</SelectItem>
                  <SelectItem value="dark">{t("Dark")}</SelectItem>
                  <SelectItem value="system">{t("System")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("Language")}</Label>
              <Select
                value={user.preferences.language}
                onValueChange={(v) => updatePreference("language", v as UserPreferences["language"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("English")}</SelectItem>
                  <SelectItem value="de">{t("German")}</SelectItem>
                  <SelectItem value="hi">{t("Hindi")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t("Email notifications")}</p>
                <p className="text-xs text-muted-foreground">{t("Receive account and academic updates by email.")}</p>
              </div>
              <Switch
                checked={user.preferences.emailNotifications}
                onCheckedChange={(v) => updatePreference("emailNotifications", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t("SMS notifications")}</p>
                <p className="text-xs text-muted-foreground">{t("Receive urgent alerts by SMS.")}</p>
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
