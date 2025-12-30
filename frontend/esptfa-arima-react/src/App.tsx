import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateAnalysisPage from "./pages/CreateAnalysisPage";
import AssessmentEditorPage from "./pages/AssessmentEditorPage";
import AnalysisDetailPage from "./pages/AnalysisDetailPage";
import "./App.css";

// Basic Private Route wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("access");
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
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
          path="/dashboard/analysis/:docId"
          element={
            <PrivateRoute>
              <AnalysisDetailPage />
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
