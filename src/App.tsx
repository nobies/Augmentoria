import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AuthLayout from './layouts/AuthLayout';
import AppShell from './layouts/AppShell';
import DashboardPage from './pages/app/DashboardPage';
import ProjectsPage from './pages/app/ProjectsPage';
import { RequirePerm } from './components/RequirePerm';
import { Navigate, useParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import NotFoundPage from './pages/NotFoundPage';
import { GoldMark } from './components/ui/bits';

const ProjectDetailPage = lazy(() => import('./pages/app/ProjectDetailPage'));
const ClientsPage = lazy(() => import('./pages/app/clients/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/app/clients/ClientDetailPage'));
const PlaceholderPage = lazy(() => import('./pages/app/PlaceholderPage'));
const ReviewsPage = lazy(() => import('./pages/review/ReviewsPage'));
const ReviewWorkspace = lazy(() => import('./pages/review/ReviewWorkspace'));
const ComparePage = lazy(() => import('./pages/review/ComparePage'));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'));
const CompaniesPage = lazy(() => import('./pages/app/admin/CompaniesPage'));
const MembersPage = lazy(() => import('./pages/app/admin/MembersPage'));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage'));
const ReportView = lazy(() => import('./pages/app/ReportsPage').then((m) => ({ default: m.ReportView })));

function OldReviewRedirect() {
  const { pid, v } = useParams();
  return <Navigate to={`/studio/review/${pid}/${v}`} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-bg">
            <div className="animate-pulse">
              <GoldMark size={40} />
            </div>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/review/:pid/:v" element={<ReviewWorkspace mode="guest" />} />
          <Route path="/studio/review/:pid/:v" element={<ReviewWorkspace />} />
          <Route path="/studio/compare/:pid/:vA/:vB" element={<ComparePage />} />
          <Route
            path="/login"
            element={
              <AuthLayout>
                <AuthPage mode="signin" />
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                <AuthPage mode="signup" />
              </AuthLayout>
            }
          />
          <Route
            path="/app/*"
            element={
              <AppShell>
                <Routes>
                  <Route index element={<DashboardPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:id" element={<ProjectDetailPage />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="clients/:id" element={<ClientDetailPage />} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="reviews/:pid/:v" element={<OldReviewRedirect />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route
                    path="reports/:pid/:v"
                    element={
                      <RequirePerm perm="reports.export">
                        <ReportView />
                      </RequirePerm>
                    }
                  />
                  <Route
                    path="team"
                    element={
                      <RequirePerm perm="team.manage">
                        <PlaceholderPage titleKey="nav_team" />
                      </RequirePerm>
                    }
                  />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route
                    path="admin/companies"
                    element={
                      <RequirePerm perm="companies.manage">
                        <CompaniesPage />
                      </RequirePerm>
                    }
                  />
                  <Route
                    path="admin/members"
                    element={
                      <RequirePerm perm="members.manage">
                        <MembersPage />
                      </RequirePerm>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AppShell>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
