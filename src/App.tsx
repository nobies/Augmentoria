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
import { RequireAuth } from './components/RequireAuth';
import Toaster from './components/Toaster';

const ProjectDetailPage = lazy(() => import('./pages/app/ProjectDetailPage'));
const ClientsPage = lazy(() => import('./pages/app/clients/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/app/clients/ClientDetailPage'));
const ReviewsPage = lazy(() => import('./pages/review/ReviewsPage'));
const ReviewWorkspace = lazy(() => import('./pages/review/ReviewWorkspace'));
const GuestReviewRoute = lazy(() => import('./pages/review/GuestReviewRoute'));
const ComparePage = lazy(() => import('./pages/review/ComparePage'));
const VideoEditorPage = lazy(() => import('./pages/editor/VideoEditorPage'));
const ProReviewBridge = lazy(() => import('./pages/review/ProReviewBridge'));
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'));
const ClientPortalPage = lazy(() => import('./pages/app/ClientPortalPage'));
const CompaniesPage = lazy(() => import('./pages/app/admin/CompaniesPage'));
const CompanyDetailPage = lazy(() => import('./pages/app/admin/CompanyDetailPage'));
const MembersPage = lazy(() => import('./pages/app/admin/MembersPage'));
const RolesPage = lazy(() => import('./pages/app/admin/RolesPage'));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage'));
const ReportView = lazy(() => import('./pages/app/ReportsPage').then((m) => ({ default: m.ReportView })));

function OldReviewRedirect() {
  const { pid, v } = useParams();
  return <Navigate to={`/studio/review/${pid}/${v}`} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster />
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
          <Route path="/review/:pid/:v" element={<GuestReviewRoute />} />
          <Route
            path="/studio/review/:pid/:v"
            element={
              <RequireAuth>
                <ReviewWorkspace experience="pro" />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/compare/:pid/:vA/:vB"
            element={
              <RequireAuth>
                <ComparePage />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/asset-compare/:pid/:assetA/:assetB"
            element={
              <RequireAuth>
                <ComparePage source="assets" />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/editor/:pid/:v"
            element={
              <RequireAuth>
                <VideoEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/pro-review/:pid/:v"
            element={
              <RequireAuth>
                <ProReviewBridge />
              </RequireAuth>
            }
          />
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
              <RequireAuth>
                <AppShell>
                  <Routes>
                  <Route index element={<DashboardPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:id" element={<ProjectDetailPage />} />
                  <Route path="my-projects" element={<ClientPortalPage />} />
                  <Route path="clients" element={<RequirePerm perm="clients.manage"><ClientsPage /></RequirePerm>} />
                  <Route path="clients/:id" element={<RequirePerm perm="clients.manage"><ClientDetailPage /></RequirePerm>} />
                  <Route path="reviews" element={<ReviewsPage />} />
                  <Route path="reviews/:pid/:v" element={<OldReviewRedirect />} />
                  <Route path="reports" element={<RequirePerm perm="reports.export"><ReportsPage /></RequirePerm>} />
                  <Route
                    path="reports/:pid/:v"
                    element={
                      <RequirePerm perm="reports.export">
                        <ReportView />
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
                    path="admin/companies/:id"
                    element={
                      <RequirePerm perm="companies.manage">
                        <CompanyDetailPage />
                      </RequirePerm>
                    }
                  />
                  <Route
                    path="admin/roles"
                    element={
                      <RequirePerm perm="roles.assign">
                        <RolesPage />
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
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
