import { useState } from "react";
import toast from "react-hot-toast";
import { BellRing, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "../push";

const DISMISS_KEY = "sms.meetings.pushBannerDismissed";

/** A quiet, dismissible offer to get class reminders on this phone/laptop. Only shown when it can work. */
export default function PushReminderBanner() {
  const { state, busy, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (state !== "off" || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-accent px-4 py-3 text-sm dark:border-brand-800 dark:bg-brand-900/20">
      <BellRing className="h-5 w-5 shrink-0 text-primary-text" aria-hidden />
      <p className="min-w-0 flex-1 text-foreground">
        <span className="font-medium">Get a reminder before each class</span>
        <span className="hidden text-muted-foreground sm:inline"> on this device, even when EduCore isn't open.</span>
      </p>
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          enable()
            .then(() => toast.success("Reminders are on for this device"))
            .catch((err: Error) => toast.error(err.message))
        }
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Turn on
      </Button>
      <button
        type="button"
        aria-label="Not now"
        className="rounded p-1 text-muted-foreground hover:bg-secondary cursor-pointer"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // Private mode: it simply shows again next visit.
          }
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
