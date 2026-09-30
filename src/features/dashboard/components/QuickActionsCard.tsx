import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuickAction } from "@/components/common/WelcomeHero";

const TILE =
  "group flex min-h-[4.5rem] flex-col items-start justify-between gap-2 rounded-lg border border-border/80 bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer";

function Tile({ action }: { action: QuickAction }) {
  const body = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground ring-1 ring-inset ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <action.icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-[13px] font-medium leading-tight text-foreground">{action.label}</span>
    </>
  );
  return action.to ? (
    <Link to={action.to} className={TILE} title={action.hint}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className={TILE} title={action.hint}>
      {body}
    </button>
  );
}

/** The role's shortcuts as a compact 2-up grid, so they sit in the side column instead of crowding the top of the page. */
export default function QuickActionsCard({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Jump straight to common tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
          {actions.map((action) => (
            <Tile key={action.label} action={action} />
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
