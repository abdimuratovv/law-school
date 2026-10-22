import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StudentShell } from '@/components/layout/StudentShell';
import { ServerCatalog as Catalog, ServerCatalog as Dashboard, ServerExam as Exam, ServerExam as Results, ServerExam as Review, ServerLobby as Lobby, ServerHistory as ProgressPage, ServerProfile as Profile, PendingFeature } from '@/pages/student/ServerExams';
import SignIn from '@/pages/student/SignIn';
import { useApp } from '@/state/AppState';
import { useAuth } from '@/state/AuthState';
import { useText } from '@/i18n/LanguageProvider';
import { Button } from '@/components/ui/basic';
import { RouteAccess, RouteErrorBoundary, RouteLoading, RouteUnavailable, SkipNavigation } from '@/components/layout/RouteAccess';

// These previews use public artboard samples, never the server question bank.
const AdminRoutes = lazy(() => import('@/pages/admin/AdminRoutes'));
const DesignSystem = lazy(() => import('@/pages/DesignSystem'));
const Mistakes = PendingFeature;
const GettingStarted = lazy(() => import('@/pages/student/GettingStarted'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const { status, refresh } = useAuth();
  const t = useText();
  const loc = useLocation();
  if (status === 'loading') return <RouteLoading />;
  if (status === 'error') return <main id="main-content" className="route-state"><h1>{t('Sign-in is temporarily unavailable.')}</h1><Button onClick={() => { void refresh(); }}>{t('Try again')}</Button></main>;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: loc.pathname + loc.search + loc.hash }} />;
  return <>{children}</>;
}

function RequireStaff({ children }: { children: ReactNode }) {
  const { user } = useApp(); const t = useText();
  return <RequireAuth>{user?.role === 'teacher' || user?.role === 'admin' ? children :
    <main id="main-content" className="route-state"><h1>{t('This page is only available to teachers.')}</h1><Button to="/">{t('Back home')}</Button></main>}</RequireAuth>;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <><SkipNavigation /><RouteErrorBoundary resetKey={pathname}><Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/design" element={<DesignSystem />} />
        <Route path="/admin/*" element={<RequireStaff><AdminRoutes /></RequireStaff>} />

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
