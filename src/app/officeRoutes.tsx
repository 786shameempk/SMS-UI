/* oxlint-disable react/only-export-components -- a route table, like router.tsx */
import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { PageSkeleton } from "@/components/ui/states";
import RouteError from "./RouteError";
import OfficeLayout, { OfficeGuard, OfficeHome } from "@/features/office/components/OfficeLayout";
import { OFFICE_DETAIL_PAGES, OFFICE_PAGES } from "@/features/office/pages/registry";

const AdminLoginPage = lazy(() => import("@/features/office/pages/AdminLoginPage"));
const AdminTokenPasswordPage = lazy(() => import("@/features/office/pages/AdminTokenPasswordPage"));

const fallback = <PageSkeleton />;

/**
 * The School Sphere office portal: its own sign-in (/adminLogin) and its own shell (/office). Kept in this file, apart
 * from router.tsx, because none of it belongs to the school app: it does not use the school session, layout, menu or
 * help routes, and a school login never opens it.
 */
export const officeRoutes: RouteObject[] = [
  { path: "/adminLogin", element: <Suspense fallback={fallback}><AdminLoginPage /></Suspense>, errorElement: <RouteError /> },
  { path: "/adminLogin/reset", element: <Suspense fallback={fallback}><AdminTokenPasswordPage mode="reset" /></Suspense>, errorElement: <RouteError /> },
  { path: "/adminLogin/accept-invite", element: <Suspense fallback={fallback}><AdminTokenPasswordPage mode="invite" /></Suspense>, errorElement: <RouteError /> },
  {
    path: "/office",
    element: (
      <OfficeGuard>
        <OfficeLayout />
      </OfficeGuard>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <OfficeHome /> },
      ...Object.entries({ ...OFFICE_PAGES, ...OFFICE_DETAIL_PAGES }).map(([path, Page]) => ({
        path,
        element: (
          <Suspense fallback={fallback}>
            <Page />
          </Suspense>
        ),
      })),
    ],
  },
];
