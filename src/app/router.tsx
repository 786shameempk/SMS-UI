import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import LandingPage from "@/features/marketing/pages/LandingPage";
import LoginPage from "@/features/authentication/pages/LoginPage";
import ForgotPasswordPage from "@/features/authentication/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/authentication/pages/ResetPasswordPage";
import SecuritySettingsPage from "@/features/authentication/pages/SecuritySettingsPage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import UserManagementPage from "@/features/administration/users/pages/UserManagementPage";
import RolePermissionManagementPage from "@/features/administration/roles/pages/RolePermissionManagementPage";
import BranchManagementPage from "@/features/administration/branches/pages/BranchManagementPage";
import StudentManagementPage from "@/features/students/pages/StudentManagementPage";
import StudentProfilePage from "@/features/students/pages/StudentProfilePage";
import AcademicManagementPage from "@/features/academics/pages/AcademicManagementPage";
import AttendanceManagementPage from "@/features/attendance/pages/AttendanceManagementPage";
import ParentPortalPage from "@/features/parent-portal/pages/ParentPortalPage";
import StaffManagementPage from "@/features/staff/pages/StaffManagementPage";
import StaffProfilePage from "@/features/staff/pages/StaffProfilePage";
import TeachersManagementPage from "@/features/teachers/pages/TeachersManagementPage";
import TeacherProfilePage from "@/features/teachers/pages/TeacherProfilePage";
import TimetableManagementPage from "@/features/timetable/pages/TimetableManagementPage";
import ExaminationManagementPage from "@/features/examinations/pages/ExaminationManagementPage";
import HomeworkManagementPage from "@/features/homework/pages/HomeworkManagementPage";
import MyHomeworkPage from "@/features/homework/pages/MyHomeworkPage";
import FeeManagementPage from "@/features/fees/pages/FeeManagementPage";
import AccountingPage from "@/features/accounting/pages/AccountingPage";
import PayrollPage from "@/features/payroll/pages/PayrollPage";
import InventoryManagementPage from "@/features/inventory/pages/InventoryManagementPage";
import CertificatesPage from "@/features/certificates/pages/CertificatesPage";
import HealthMedicalPage from "@/features/health/pages/HealthMedicalPage";
import VisitorManagementPage from "@/features/visitors/pages/VisitorManagementPage";
import HelpDeskPage from "@/features/helpdesk/pages/HelpDeskPage";
import SurveysFeedbackPage from "@/features/surveys/pages/SurveysFeedbackPage";
import PlatformConsolePage from "@/features/platform/pages/PlatformConsolePage";
import AIFeaturesPage from "@/features/ai/pages/AIFeaturesPage";
import LibraryManagementPage from "@/features/library/pages/LibraryManagementPage";
import TransportManagementPage from "@/features/transport/pages/TransportManagementPage";
import HostelManagementPage from "@/features/hostel/pages/HostelManagementPage";
import CommunicationCenterPage from "@/features/communication/pages/CommunicationCenterPage";
import NotificationCenterPage from "@/features/notifications/pages/NotificationCenterPage";
import CalendarPage from "@/features/calendar/pages/CalendarPage";
import ReportsPage from "@/features/reports/pages/ReportsPage";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import CreativeCampusLayout from "@/features/talents/components/CreativeCampusLayout";
import DiscoverPage from "@/features/talents/pages/DiscoverPage";
import ExplorePage from "@/features/talents/pages/ExplorePage";
import TalentDetailPage from "@/features/talents/pages/TalentDetailPage";
import TalentComposerPage from "@/features/talents/pages/TalentComposerPage";
import MyTalentsPage from "@/features/talents/pages/MyTalentsPage";
import ReviewCenterPage from "@/features/talents/pages/ReviewCenterPage";
import CreatorProfilePage from "@/features/talents/pages/CreatorProfilePage";
import SchoolShowcasePage from "@/features/talents/pages/SchoolShowcasePage";
import MeetingsHomePage from "@/features/meetings/pages/MeetingsHomePage";
import MeetingCalendarPage from "@/features/meetings/pages/MeetingCalendarPage";
import MeetingDetailsPage from "@/features/meetings/pages/MeetingDetailsPage";
import MeetingReportsPage from "@/features/meetings/pages/MeetingReportsPage";
import MeetingRoomPage from "@/features/meetings/pages/MeetingRoomPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
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
