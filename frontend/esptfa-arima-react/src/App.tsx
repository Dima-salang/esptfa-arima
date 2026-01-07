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


// Dispatcher to handle landing on /dashboard
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

// Basic Private Route wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("access");
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const fetchProfile = useUserStore((state) => state.fetchProfile);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <Router>
      <Toaster position="top-right" expand={false} richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardDispatcher />
            </PrivateRoute>
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
              <CreateAnalysisPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/editor/:draftId"
          element={
            <PrivateRoute>
              <AssessmentEditorPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/drafts"
          element={
            <PrivateRoute>
              <AllDraftsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/analysis/:docId"
          element={
            <PrivateRoute>
              <AnalysisDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/analysis/:docId/student/:lrn"
          element={
            <PrivateRoute>
              <StudentAnalysisPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/analysis"
          element={
            <PrivateRoute>
              <AllAnalysisPage />
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
              <TeacherAssignmentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/import-students"
          element={
            <PrivateRoute>
              <StudentImportPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/users"
          element={
            <PrivateRoute>
              <UserManagement />
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
