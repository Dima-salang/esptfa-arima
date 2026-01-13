import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateAnalysisPage from "./pages/CreateAnalysisPage";
import AssessmentEditorPage from "./pages/AssessmentEditorPage";
import AllDraftsPage from "./pages/AllDraftsPage";
import AnalysisDetailPage from "./pages/AnalysisDetailPage";
import StudentAnalysisPage from "./pages/StudentAnalysisPage";
import AllAnalysisPage from "./pages/AllAnalysisPage";
import SettingsPage from "./pages/SettingsPage";
import TeacherAssignmentsPage from "./pages/TeacherAssignmentsPage";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import StudentDashboard from "./pages/StudentDashboard";
import StudentImportPage from "./pages/StudentImportPage";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserStore } from "./store/useUserStore";
import { Toaster } from "@/components/ui/sonner";
import "./App.css";

const DashboardDispatcher = () => {
  const { user, loading } = useUserStore();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (user?.acc_type === "ADMIN") {
    return <AdminDashboard />;
  }

  if (user?.acc_type === "STUDENT") {
    return <StudentDashboard />;
  }

  return <TeacherDashboard />;
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useUserStore();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const RoleRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user || !allowedRoles.includes(user.acc_type)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

function App() {
  const { user, loading, fetchProfile } = useUserStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <Router>
      <Toaster position="top-right" expand={false} richColors />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />

        {/* Protected Dashboard Layout Route */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          {/* Index route - Dispatches to correct dashboard based on role */}
          <Route index element={<DashboardDispatcher />} />

          <Route
            path="student-analysis/:docId/:lrn"
            element={<StudentAnalysisPage />}
          />

          <Route
            path="create-analysis"
            element={
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <CreateAnalysisPage />
              </RoleRoute>
            }
          />

          <Route
            path="editor/:draftId"
            element={
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <AssessmentEditorPage />
              </RoleRoute>
            }
          />

          <Route
            path="drafts"
            element={
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <AllDraftsPage />
              </RoleRoute>
            }
          />

          <Route
            path="analysis/:docId"
            element={
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <AnalysisDetailPage />
              </RoleRoute>
            }
          />

          <Route
            path="analysis/:docId/student/:lrn"
            element={
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <StudentAnalysisPage />
              </RoleRoute>
            }
          />

          <Route
            path="analysis"
            element={
              <RoleRoute allowedRoles={["ADMIN", "TEACHER", "STUDENT"]}>
                <AllAnalysisPage />
              </RoleRoute>
            }
          />

          <Route
            path="settings"
            element={
              <SettingsPage />
            }
          />

          <Route
            path="assignments"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <TeacherAssignmentsPage />
              </RoleRoute>
            }
          />

          <Route
            path="import-students"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <StudentImportPage />
              </RoleRoute>
            }
          />

          <Route
            path="users"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <UserManagement />
              </RoleRoute>
            }
          />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
