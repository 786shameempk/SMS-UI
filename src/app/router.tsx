import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import LoginPage from "@/features/authentication/pages/LoginPage";
import ForgotPasswordPage from "@/features/authentication/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/authentication/pages/ResetPasswordPage";
import SecuritySettingsPage from "@/features/authentication/pages/SecuritySettingsPage";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import UserManagementPage from "@/features/administration/users/pages/UserManagementPage";
import RolePermissionManagementPage from "@/features/administration/roles/pages/RolePermissionManagementPage";
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

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "account/security", element: <SecuritySettingsPage /> },
      { path: "admin/users", element: <UserManagementPage /> },
      { path: "admin/roles", element: <RolePermissionManagementPage /> },
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
    ],
  },
]);
