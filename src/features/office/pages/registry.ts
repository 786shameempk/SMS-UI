import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * The office screens that exist. The menu (navigation.ts) lists only entries found here, so a screen appears in the
 * menu exactly when it is built; nothing in the menu is a placeholder.
 */
export const OFFICE_PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  dashboard: lazy(() => import("./DashboardPage")),
  schools: lazy(() => import("./SchoolsPage")),
  onboarding: lazy(() => import("./OnboardingPage")),
  "bulk-import": lazy(() => import("./BulkImportPage")),
  "profile-approvals": lazy(() => import("./ProfileApprovalsPage")),
  plans: lazy(() => import("./PlansPage")),
  "plan-builder": lazy(() => import("./QuotationBuilderPage")),
  quotations: lazy(() => import("./QuotationsPage")),
  purchases: lazy(() => import("./PurchasesPage")),
  subscriptions: lazy(() => import("./SubscriptionsPage")),
  billing: lazy(() => import("./BillingPage")),
  invoices: lazy(() => import("./InvoicesPage")),
  monitoring: lazy(() => import("./MonitoringPage")),
  reports: lazy(() => import("./ReportsPage")),
  settings: lazy(() => import("./OfficeSettingsPage")),
  users: lazy(() => import("./OfficeUsersPage")),
  roles: lazy(() => import("./OfficeRolesPage")),
  audit: lazy(() => import("./AuditLogsPage")),
  security: lazy(() => import("./SecurityPage")),
};

/** Detail screens reached from the lists above. They are not menu entries. */
export const OFFICE_DETAIL_PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  "schools/:id": lazy(() => import("./SchoolDetailPage")),
  "quotations/:id": lazy(() => import("./QuotationDetailPage")),
  "subscriptions/:id": lazy(() => import("./SubscriptionDetailPage")),
};

export const OFFICE_PAGE_PATHS: ReadonlySet<string> = new Set(Object.keys(OFFICE_PAGES));
