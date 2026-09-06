import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Pages — lazy-loaded for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const IntroPage = lazy(() => import('./pages/IntroPage'));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const Login = lazy(() => import('./pages/Login'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Upload = lazy(() => import('./pages/Upload'));
const Notes = lazy(() => import('./pages/Notes'));
const Attendance = lazy(() => import('./pages/Attendance'));
const KarmaPoll = lazy(() => import('./pages/KarmaPoll'));
const MyClassroom = lazy(() => import('./pages/MyClassroom'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Components
import ProtectedRoute from './components/ProtectedRoute';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function LandingRoute() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

function InnerApp() {
  return (
    <>
      {/* Aurora animated background */}
      <div className="aurora-bg" />

      {/* Toast notifications - top center */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingRoute />} />
          <Route path="/intro" element={<IntroPage />} />
          <Route path="/role" element={<RoleSelection />} />
          <Route path="/auth/student" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/login" element={<Navigate to="/auth/student" replace />} />

          {/* Protected student routes */}
          <Route path="/auth/set-password" element={
            <ProtectedRoute><SetPassword /></ProtectedRoute>
          } />
          <Route path="/auth/student-onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute><Upload /></ProtectedRoute>
          } />
          <Route path="/notes" element={
            <ProtectedRoute><Notes /></ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute><Attendance /></ProtectedRoute>
          } />
          <Route path="/karma-poll" element={
            <ProtectedRoute><KarmaPoll /></ProtectedRoute>
          } />
          <Route path="/classroom" element={
            <ProtectedRoute><MyClassroom /></ProtectedRoute>
          } />

          {/* Protected admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>
          } />

          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
