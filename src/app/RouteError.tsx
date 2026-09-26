import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { ArrowLeft, Home, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown instead of a blank screen when a page throws while rendering or its code chunk fails to load
 * (e.g. after a new deploy). Never shows the raw error; it's logged to the console for developers.
 */
export default function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const chunkFailed = error instanceof Error && /dynamically imported module|Loading chunk|Importing a module script failed/i.test(error.message);

  if (!notFound) console.error(error);

  const title = notFound ? "Page not found" : chunkFailed ? "A new version is available" : "Something went wrong";
  const description = notFound
    ? "The page you're looking for doesn't exist or has moved."
    : chunkFailed
      ? "The app was updated while you were using it. Reload to get the latest version."
      : "This page ran into an unexpected problem. Your data is safe — try reloading, or head back to the dashboard.";

  return (
    <div role="alert" className="flex min-h-[60vh] flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary-text">{notFound ? "404" : "Error"}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {!notFound && (
            <Button onClick={() => window.location.reload()}>
              <RotateCw className="h-4 w-4" />
              Reload page
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
