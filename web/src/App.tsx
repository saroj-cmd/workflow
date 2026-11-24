import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth, isStaff } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Logo } from "./components/ui";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Onboarding } from "./pages/Onboarding";
import { DocumentsPage } from "./pages/Documents";
import { TasksPage } from "./pages/Tasks";
import { ProjectsPage } from "./pages/Projects";
import { PeoplePage } from "./pages/People";
import { PersonPage } from "./pages/Person";
import { ProfilePage } from "./pages/Profile";

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="grid h-screen place-items-center">
        <div className="animate-pulse"><Logo /></div>
      </div>
    );

  if (!user)
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
        </Routes>
      </AnimatePresence>
    );

  const staff = isStaff(user);
  const approved = user.status === "APPROVED";

  return (
    <Layout>
      <Routes>
        {!staff && !approved ? (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {!staff && <Route path="/documents" element={<DocumentsPage />} />}
            {staff && <Route path="/projects" element={<ProjectsPage />} />}
            {staff && <Route path="/people" element={<PeoplePage />} />}
            {staff && <Route path="/people/:id" element={<PersonPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}
