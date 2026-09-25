import { create } from "zustand";

/** The off-canvas sidebar on phones (below md). Deliberately not persisted: it always starts closed. */
interface MobileNavState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useMobileNav = create<MobileNavState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
