import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StudentShell } from '@/components/layout/StudentShell';
import Catalog from '@/pages/student/Catalog';
import Dashboard from '@/pages/student/Dashboard';
import Exam from '@/pages/student/Exam';
import { Mistakes, Profile, ProgressPage } from '@/pages/student/Extras';
import Lobby from '@/pages/student/Lobby';
import Results from '@/pages/student/Results';
import Review from '@/pages/student/Review';
import SignIn from '@/pages/student/SignIn';
import GettingStarted from '@/pages/student/GettingStarted';
import { useApp } from '@/state/AppState';
import { RouteAccess, RouteErrorBoundary, RouteLoading, RouteUnavailable, SkipNavigation } from '@/components/layout/RouteAccess';

// Teacher workspace and the design-system reference load on demand.
const AdminRoutes = lazy(() => import('@/pages/admin/AdminRoutes'));
const DesignSystem = lazy(() => import('@/pages/DesignSystem'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const loc = useLocation();
  if (!user) return <Navigate to="/sign-in" replace state={{ from: loc.pathname + loc.search + loc.hash }} />;
  return <>{children}</>;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <><SkipNavigation /><RouteErrorBoundary resetKey={pathname}><Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/design" element={<DesignSystem />} />
        <Route path="/admin/*" element={<AdminRoutes />} />

        <Route path="/tests/:testId" element={<RequireAuth><Lobby /></RequireAuth>} />
        <Route path="/exam/:testId" element={<RequireAuth><Exam /></RequireAuth>} />
        <Route path="/results/:attemptId/q/:n" element={<RequireAuth><Review /></RequireAuth>} />

        <Route element={<RequireAuth><StudentShell /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="tests" element={<Catalog />} />
          <Route path="getting-started" element={<GettingStarted />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="mistakes" element={<Mistakes />} />
          <Route path="profile" element={<Profile />} />
          <Route path="results/:attemptId" element={<Results />} />
        </Route>

        <Route path="*" element={<RouteUnavailable />} />
      </Routes>
      <RouteAccess />
    </Suspense></RouteErrorBoundary></>
  );
}
