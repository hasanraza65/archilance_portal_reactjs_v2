import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/auth/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import FullscreenLoader from "@/components/layout/FullscreenLoader";
import RootRedirect from "@/pages/RootRedirect";
import NotFoundPage from "@/pages/NotFoundPage";
import LoginPage from "@/features/auth/LoginPage";

const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const MyDashboardPage = lazy(() => import("@/features/dashboard/MyDashboardPage"));
const JobsListPage = lazy(() => import("@/features/jobs/JobsListPage"));
const JobDetailPage = lazy(() => import("@/features/jobs/JobDetailPage"));
const TaskFullPage = lazy(() => import("@/features/tasks/TaskFullPage"));
const WorkDiaryPage = lazy(() => import("@/features/workDiary/WorkDiaryPage"));
const EmployeeWorkDiaryPage = lazy(() => import("@/features/workDiary/EmployeeWorkDiaryPage"));
const BulkExportPage = lazy(() => import("@/features/workDiary/BulkExportPage"));
const EmployeesPage = lazy(() => import("@/features/employees/EmployeesPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage"));
const MyLeavesPage = lazy(() => import("@/features/leave/MyLeavesPage"));
const StaffLeavesPage = lazy(() => import("@/features/leave/StaffLeavesPage"));
const ContractsPage = lazy(() => import("@/features/contracts/ContractsPage"));
const TemplateEditor = lazy(() => import("@/features/contracts/TemplateEditor"));
const SendContract = lazy(() => import("@/features/contracts/SendContract"));
const PublicContractView = lazy(() => import("@/features/contracts/PublicContractView"));
const ChatPage = lazy(() => import("@/features/chat/ChatPage"));
const CustomersPage = lazy(() => import("@/features/customers/CustomersPage"));
const CustomerTeamPage = lazy(() => import("@/features/customerTeam/CustomerTeamPage"));
const TeamAccessPage = lazy(() => import("@/features/customerTeam/TeamAccessPage"));
const SubscriptionPage = lazy(() => import("@/features/subscription/SubscriptionPage"));
const NotificationSettingsPage = lazy(() => import("@/features/notifications/NotificationSettingsPage"));
const AppDownloadPage = lazy(() => import("@/features/appDownload/AppDownloadPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/ForgotPasswordPage"));
const EmployeeFormPage = lazy(() => import("@/features/employees/EmployeeFormPage"));
const EmployeeDetailPage = lazy(() => import("@/features/employees/EmployeeDetailPage"));
const WorkingHoursPage = lazy(() => import("@/features/employees/WorkingHoursPage"));
const CustomerDetailPage = lazy(() => import("@/features/customers/CustomerDetailPage"));
const AllCustomerTeamsPage = lazy(() => import("@/features/customerTeam/AllCustomerTeamsPage"));
const MyGradingPage = lazy(() => import("@/features/internee/MyGradingPage"));
const InterneeGradingPage = lazy(() => import("@/features/internee/InterneeGradingPage"));
const JobWorkDiaryPage = lazy(() => import("@/features/workDiary/JobWorkDiaryPage"));
const PoliciesPage = lazy(() => import("@/features/policies/PoliciesPage"));

const withSuspense = (el) => <Suspense fallback={<FullscreenLoader />}>{el}</Suspense>;

const ALL_INTERNAL_ROLES = ["admin", "employee", "manager", "outsource", "supervisor", "executive", "internee"];
const JOBS_ROLES = ["admin", "employee", "customer", "member", "outsource", "manager", "supervisor", "executive", "internee"];

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
      <Route path="/contract/view/:token" element={withSuspense(<PublicContractView />)} />

      <Route element={<AppShell />}>
        <Route path="/" element={<RootRedirect />} />

        <Route
          path="/dashboard"
          element={<ProtectedRoute allowedRoles={["admin", "customer"]}>{withSuspense(<DashboardPage />)}</ProtectedRoute>}
        />
        {/* Personal, role-aware dashboard for everyone on the delivery side. */}
        <Route
          path="/my-dashboard"
          element={
            <ProtectedRoute allowedRoles={["employee", "manager", "supervisor", "executive", "outsource", "internee", "admin"]}>
              {withSuspense(<MyDashboardPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={<ProtectedRoute allowedRoles={JOBS_ROLES}>{withSuspense(<JobsListPage />)}</ProtectedRoute>}
        />
        <Route
          path="/jobs/:projectId"
          element={<ProtectedRoute allowedRoles={JOBS_ROLES}>{withSuspense(<JobDetailPage />)}</ProtectedRoute>}
        />
        <Route
          path="/jobs/task/:taskId"
          element={<ProtectedRoute allowedRoles={JOBS_ROLES}>{withSuspense(<TaskFullPage />)}</ProtectedRoute>}
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee", "outsource", "manager", "supervisor", "executive"]}>
              {withSuspense(<ChatPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:contactId"
          element={
            <ProtectedRoute allowedRoles={["admin", "employee", "outsource", "manager", "supervisor", "executive"]}>
              {withSuspense(<ChatPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/work-diary"
          element={
            <ProtectedRoute allowedRoles={["employee", "outsource", "manager", "supervisor", "executive"]}>
              {withSuspense(<WorkDiaryPage />)}
            </ProtectedRoute>
          }
        />
        {/* Must stay ABOVE /work-diary/:employeeId. Router ranking already puts a
            static segment ahead of a dynamic one, but the order makes it obvious
            that "bulk-export" is a page, not an employee id. */}
        <Route
          path="/work-diary/bulk-export"
          element={
            <ProtectedRoute allowedRoles={["admin", "executive"]}>
              {withSuspense(<BulkExportPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-diary/:employeeId"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<EmployeeWorkDiaryPage />)}
            </ProtectedRoute>
          }
        />

        {/* Hours logged against one job — how a customer sees time on their own work. */}
        <Route
          path="/jobs/:projectId/work-diary"
          element={
            <ProtectedRoute allowedRoles={JOBS_ROLES}>
              {withSuspense(<JobWorkDiaryPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-leaves"
          element={
            // "outsource" role removed — Outsource Department (the TEAM,
            // independent of role) can't be expressed as a role list, so
            // MyLeavesPage itself renders a restricted state for that case
            // (see canUseMyLeaves in features/leave/access.js).
            <ProtectedRoute allowedRoles={["employee", "manager", "supervisor", "executive"]}>
              {withSuspense(<MyLeavesPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive", "member"]}>
              {withSuspense(<StaffLeavesPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/policies"
          element={
            // Internees aren't covered by this policy at all (see My Grading
            // instead) — the Outsource Department / Business Team exclusion
            // can't be expressed as a fixed role list, so PoliciesPage itself
            // renders a restricted-access state for those (see canViewPolicies).
            <ProtectedRoute allowedRoles={ALL_INTERNAL_ROLES.filter((r) => r !== "internee")}>
              {withSuspense(<PoliciesPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-grading"
          element={
            <ProtectedRoute allowedRoles={["internee"]}>
              {withSuspense(<MyGradingPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/internee-grading"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<InterneeGradingPage />)}
            </ProtectedRoute>
          }
        />

        {/* Employees — /new must be declared before /:employeeId or "new" is
            swallowed as an id. */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<EmployeesPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<EmployeeFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:employeeId"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<EmployeeDetailPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:employeeId/edit"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<EmployeeFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:employeeId/work-hours"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<WorkingHoursPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<CustomersPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:customerId"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<CustomerDetailPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-teams"
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "supervisor", "executive"]}>
              {withSuspense(<AllCustomerTeamsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              {withSuspense(<CustomerTeamPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/teamaccess"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              {withSuspense(<TeamAccessPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/contracts"
          element={<ProtectedRoute allowedRoles={["admin", "executive"]}>{withSuspense(<ContractsPage />)}</ProtectedRoute>}
        />
        <Route
          path="/contracts/send"
          element={<ProtectedRoute allowedRoles={["admin", "executive"]}>{withSuspense(<SendContract />)}</ProtectedRoute>}
        />
        <Route
          path="/contracts/templates/new"
          element={<ProtectedRoute allowedRoles={["admin", "executive"]}>{withSuspense(<TemplateEditor />)}</ProtectedRoute>}
        />
        <Route
          path="/contracts/templates/:id/edit"
          element={<ProtectedRoute allowedRoles={["admin", "executive"]}>{withSuspense(<TemplateEditor />)}</ProtectedRoute>}
        />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              {withSuspense(<SubscriptionPage />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={ALL_INTERNAL_ROLES.concat(["customer", "member"])}>
              {withSuspense(<NotificationsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/notification-settings"
          element={
            <ProtectedRoute allowedRoles={ALL_INTERNAL_ROLES.concat(["customer", "member"])}>
              {withSuspense(<NotificationSettingsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={ALL_INTERNAL_ROLES.concat(["customer", "member"])}>
              {withSuspense(<ProfilePage />)}
            </ProtectedRoute>
          }
        />

        {/* Desktop tracker download — open to every signed-in role, matching v1. */}
        <Route
          path="/download"
          element={
            <ProtectedRoute allowedRoles={ALL_INTERNAL_ROLES.concat(["customer", "member"])}>
              {withSuspense(<AppDownloadPage />)}
            </ProtectedRoute>
          }
        />

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
