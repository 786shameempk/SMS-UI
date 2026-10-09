import { create } from "zustand";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "./capabilities";

/** Whether the "Ask School AI" panel is open. Shared so the header button and the floating launcher drive the same panel. */
export const useAskAi = create<{ open: boolean; setOpen: (open: boolean) => void; toggle: () => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

/** The assistant is offered when the school and role include AI and the backend reports chat available; the AI page already is the assistant. */
export function useAskAiAvailable(): boolean {
  const { pathname } = useLocation();
  const aiModule = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.aiFeatures);
  const { can } = useAiCapabilities();
  return aiModule && can("chat") && pathname !== "/ai";
}
