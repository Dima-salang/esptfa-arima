import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
  const token = localStorage.getItem("access");

  return token ? <>{children}</> : <Navigate to="/login" />;
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
    if (user === null && !loading) {
      fetchProfile();
    }
  }, []);

  return (
    <Router>
      <Toaster position="top-right" expand={false} richColors />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard"
          element={
            loading ? (
              <div className="flex items-center justify-center h-screen">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : user ? (
              <DashboardDispatcher />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/dashboard/student-analysis/:docId/:lrn"
          element={
            <PrivateRoute>
              <StudentAnalysisPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/create-analysis"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <CreateAnalysisPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/editor/:draftId"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <AssessmentEditorPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/drafts"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <AllDraftsPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/analysis/:docId"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <AnalysisDetailPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/analysis/:docId/student/:lrn"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <StudentAnalysisPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/analysis"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN", "TEACHER", "STUDENT"]}>
                <AllAnalysisPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/assignments"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN"]}>
                <TeacherAssignmentsPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/import-students"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN"]}>
                <StudentImportPage />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard/users"
          element={
            <PrivateRoute>
              <RoleRoute allowedRoles={["ADMIN"]}>
                <UserManagement />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
