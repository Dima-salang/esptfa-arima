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
import { useUserStore } from "./store/useUserStore";
import "./App.css";


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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <TeacherDashboard />
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


        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
