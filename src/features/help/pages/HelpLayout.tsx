import { Suspense } from "react";
import { Link, Outlet } from "react-router-dom";
import { LifeBuoy, LogIn } from "lucide-react";
import AppLayout from "@/layouts/AppLayout";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/states";
import { BrandMark } from "@/features/authentication/components/LoginShowcase";
import { useViewer } from "../useViewer";

/** Help for people who are not signed in: the same pages, in a bare shell with a way to sign in. */
function PublicShell() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/help" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandMark />
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <LifeBuoy className="h-4 w-4 text-primary-text" aria-hidden="true" />
              Help Center
            </span>
          </Link>
          <Button asChild size="sm">
            <Link to="/login">
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Sign in
            </Link>
          </Button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/**
 * The Help Center is for everyone: signed-in users get it inside the app (sidebar, header, Ask School AI); anyone else gets
 * the public articles in a plain shell. Which articles each sees is decided by their classification, not by this shell.
 */
export default function HelpLayout() {
  const viewer = useViewer();
  return viewer.role ? <AppLayout /> : <PublicShell />;
}
