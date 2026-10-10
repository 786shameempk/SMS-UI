import type { NavigationAction } from "../navigation";
import { resolveNavigation } from "../navigation";
import { useViewer } from "../useViewer";
import { GoButton } from "./HelpReplyCard";

/**
 * A screen the AI service offered to open. The service sends only a screen id; the address comes from this app's route table
 * and the reader's access is checked again here. It is a button the reader presses, never an automatic jump, and an offer for
 * a screen that is unknown or closed to this reader shows nothing.
 */
export default function NavigationOffer({ actions }: { actions: NavigationAction[] }) {
  const viewer = useViewer();
  const offer = actions.map((a) => resolveNavigation(a, viewer)).find((r) => r.status === "ok");
  if (!offer || offer.status !== "ok") return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <GoButton navigation={offer} />
      {offer.menuPath.length > 1 && <span className="text-xs text-muted-foreground">{offer.menuPath.join(" → ")}</span>}
    </div>
  );
}
