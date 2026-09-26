// Lazy page constants are not components defined here, so the fast-refresh rule does not apply to this file.
/* oxlint-disable react/only-export-components */
import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import RouteError from "./RouteError";
import ProtectedRoute from "@/routes/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
const LandingPage = lazy(() => import("@/features/marketing/pages/LandingPage"));
const LoginPage = lazy(() => import("@/features/authentication/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("@/features/authentication/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/features/authentication/pages/ResetPasswordPage"));
const SecuritySettingsPage = lazy(() => import("@/features/authentication/pages/SecuritySettingsPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const UserManagementPage = lazy(() => import("@/features/administration/users/pages/UserManagementPage"));
const RolePermissionManagementPage = lazy(() => import("@/features/administration/roles/pages/RolePermissionManagementPage"));
const BranchManagementPage = lazy(() => import("@/features/administration/branches/pages/BranchManagementPage"));
const StudentManagementPage = lazy(() => import("@/features/students/pages/StudentManagementPage"));
const StudentProfilePage = lazy(() => import("@/features/students/pages/StudentProfilePage"));
const AcademicManagementPage = lazy(() => import("@/features/academics/pages/AcademicManagementPage"));
const AttendanceManagementPage = lazy(() => import("@/features/attendance/pages/AttendanceManagementPage"));
const ParentPortalPage = lazy(() => import("@/features/parent-portal/pages/ParentPortalPage"));
const StaffManagementPage = lazy(() => import("@/features/staff/pages/StaffManagementPage"));
const StaffProfilePage = lazy(() => import("@/features/staff/pages/StaffProfilePage"));
const TeachersManagementPage = lazy(() => import("@/features/teachers/pages/TeachersManagementPage"));
const TeacherProfilePage = lazy(() => import("@/features/teachers/pages/TeacherProfilePage"));
const TimetableManagementPage = lazy(() => import("@/features/timetable/pages/TimetableManagementPage"));
const ExaminationManagementPage = lazy(() => import("@/features/examinations/pages/ExaminationManagementPage"));
const HomeworkManagementPage = lazy(() => import("@/features/homework/pages/HomeworkManagementPage"));
const MyHomeworkPage = lazy(() => import("@/features/homework/pages/MyHomeworkPage"));
const FeeManagementPage = lazy(() => import("@/features/fees/pages/FeeManagementPage"));
const AccountingPage = lazy(() => import("@/features/accounting/pages/AccountingPage"));
const PayrollPage = lazy(() => import("@/features/payroll/pages/PayrollPage"));
const InventoryManagementPage = lazy(() => import("@/features/inventory/pages/InventoryManagementPage"));
const CertificatesPage = lazy(() => import("@/features/certificates/pages/CertificatesPage"));
const HealthMedicalPage = lazy(() => import("@/features/health/pages/HealthMedicalPage"));
const VisitorManagementPage = lazy(() => import("@/features/visitors/pages/VisitorManagementPage"));
const HelpDeskPage = lazy(() => import("@/features/helpdesk/pages/HelpDeskPage"));
const SurveysFeedbackPage = lazy(() => import("@/features/surveys/pages/SurveysFeedbackPage"));
const PlatformConsolePage = lazy(() => import("@/features/platform/pages/PlatformConsolePage"));
const AIFeaturesPage = lazy(() => import("@/features/ai/pages/AIFeaturesPage"));
const LibraryManagementPage = lazy(() => import("@/features/library/pages/LibraryManagementPage"));
const TransportManagementPage = lazy(() => import("@/features/transport/pages/TransportManagementPage"));
const HostelManagementPage = lazy(() => import("@/features/hostel/pages/HostelManagementPage"));
const CommunicationCenterPage = lazy(() => import("@/features/communication/pages/CommunicationCenterPage"));
const NotificationCenterPage = lazy(() => import("@/features/notifications/pages/NotificationCenterPage"));
const CalendarPage = lazy(() => import("@/features/calendar/pages/CalendarPage"));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage"));
const StudyMaterialsPage = lazy(() => import("@/features/study-materials/pages/StudyMaterialsPage"));
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage"));
const CreativeCampusLayout = lazy(() => import("@/features/talents/components/CreativeCampusLayout"));
const DiscoverPage = lazy(() => import("@/features/talents/pages/DiscoverPage"));
const ExplorePage = lazy(() => import("@/features/talents/pages/ExplorePage"));
const TalentDetailPage = lazy(() => import("@/features/talents/pages/TalentDetailPage"));
const TalentComposerPage = lazy(() => import("@/features/talents/pages/TalentComposerPage"));
const MyTalentsPage = lazy(() => import("@/features/talents/pages/MyTalentsPage"));
const ReviewCenterPage = lazy(() => import("@/features/talents/pages/ReviewCenterPage"));
const CreatorProfilePage = lazy(() => import("@/features/talents/pages/CreatorProfilePage"));
const SchoolShowcasePage = lazy(() => import("@/features/talents/pages/SchoolShowcasePage"));
const MeetingsHomePage = lazy(() => import("@/features/meetings/pages/MeetingsHomePage"));
const MeetingCalendarPage = lazy(() => import("@/features/meetings/pages/MeetingCalendarPage"));
const MeetingDetailsPage = lazy(() => import("@/features/meetings/pages/MeetingDetailsPage"));
const MeetingReportsPage = lazy(() => import("@/features/meetings/pages/MeetingReportsPage"));
const MeetingRoomPage = lazy(() => import("@/features/meetings/pages/MeetingRoomPage"));

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage />, errorElement: <RouteError /> },
  { path: "/login", element: <LoginPage />, errorElement: <RouteError /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    // The live classroom is full screen, outside the app shell (no sidebar/header), but still signed-in only.
    path: "/online-classes/:id/room",
    element: (
      <ProtectedRoute>
        <MeetingRoomPage />
      </ProtectedRoute>
    ),
  },
  {
    // Pathless layout route: contributes no URL segment of its own, so every child below
    // still resolves to the same absolute path it always has (e.g. "dashboard" -> "/dashboard").
    // "/" itself now belongs to the public LandingPage above, not this protected tree.
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "account/security", element: <SecuritySettingsPage /> },
      { path: "admin/users", element: <UserManagementPage /> },
      { path: "admin/roles", element: <RolePermissionManagementPage /> },
      { path: "admin/branches", element: <BranchManagementPage /> },
      { path: "admin/settings", element: <SettingsPage /> },
      { path: "students", element: <StudentManagementPage /> },
      { path: "students/:studentId", element: <StudentProfilePage /> },
      { path: "academics", element: <AcademicManagementPage /> },
      { path: "attendance", element: <AttendanceManagementPage /> },
      { path: "parent-portal", element: <ParentPortalPage /> },
      { path: "staff", element: <StaffManagementPage /> },
      { path: "staff/:staffId", element: <StaffProfilePage /> },
      { path: "teachers", element: <TeachersManagementPage /> },
      { path: "teachers/:staffId", element: <TeacherProfilePage /> },
      { path: "timetable", element: <TimetableManagementPage /> },
      { path: "examinations", element: <ExaminationManagementPage /> },
      { path: "homework", element: <HomeworkManagementPage /> },
      { path: "my-homework", element: <MyHomeworkPage /> },
      { path: "fees", element: <FeeManagementPage /> },
      { path: "accounting", element: <AccountingPage /> },
      { path: "payroll", element: <PayrollPage /> },
      { path: "inventory", element: <InventoryManagementPage /> },
      { path: "certificates", element: <CertificatesPage /> },
      { path: "health", element: <HealthMedicalPage /> },
      { path: "visitors", element: <VisitorManagementPage /> },
      { path: "helpdesk", element: <HelpDeskPage /> },
      { path: "surveys", element: <SurveysFeedbackPage /> },
      { path: "platform", element: <PlatformConsolePage /> },
      { path: "ai", element: <AIFeaturesPage /> },
      { path: "library", element: <LibraryManagementPage /> },
      { path: "transport", element: <TransportManagementPage /> },
      { path: "hostel", element: <HostelManagementPage /> },
      { path: "communication", element: <CommunicationCenterPage /> },
      { path: "notifications", element: <NotificationCenterPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "online-classes", element: <MeetingsHomePage /> },
      { path: "online-classes/calendar", element: <MeetingCalendarPage /> },
      { path: "online-classes/reports", element: <MeetingReportsPage /> },
      { path: "online-classes/:id", element: <MeetingDetailsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "study-materials", element: <StudyMaterialsPage /> },
      {
        // Talent Showcase ("Creative Campus") - its own layout supplies the module nav and identity.
        path: "talents",
        element: <CreativeCampusLayout />,
        children: [
          { index: true, element: <DiscoverPage /> },
          { path: "explore", element: <ExplorePage /> },
          { path: "new", element: <TalentComposerPage /> },
          { path: "mine", element: <MyTalentsPage /> },
          { path: "review", element: <ReviewCenterPage /> },
          { path: "creators/:userId", element: <CreatorProfilePage /> },
          { path: "schools/:tenantId", element: <SchoolShowcasePage /> },
          { path: ":id", element: <TalentDetailPage /> },
          { path: ":id/edit", element: <TalentComposerPage key="edit" /> },
        ],
      },
    ],
  },
]);
