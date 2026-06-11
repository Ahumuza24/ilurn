/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { LearnerDashboard } from './pages/LearnerDashboard';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminStudentDetail } from './pages/admin/AdminStudentDetail';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { WordReading } from './pages/WordReading';
import { Spelling } from './pages/Spelling';
import { EnglishSpellingBee } from './pages/EnglishSpellingBee';
import { useUserStore, type UserRole } from './lib/store';

function dashboardForRole(role: UserRole | null) {
  if (role === 'ADMIN') return '/dashboard/admin';
  if (role === 'LEARNER') return '/dashboard/learner';
  return '/login';
}

function RequireRole({ role, children }: { role: UserRole; children: ReactElement }) {
  const { isAuthenticated, role: currentRole } = useUserStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentRole !== role) return <Navigate to={dashboardForRole(currentRole)} replace />;
  return children;
}

function HomeRedirect() {
  const { isAuthenticated, role } = useUserStore();
  return <Navigate to={isAuthenticated ? dashboardForRole(role) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/learner" element={<RequireRole role="LEARNER"><LearnerDashboard /></RequireRole>} />
          <Route path="/dashboard/admin" element={<RequireRole role="ADMIN"><AdminLayout /></RequireRole>}>
            <Route index element={<AdminOverview />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="students/:id" element={<AdminStudentDetail />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
          <Route path="/assessment/word-reading" element={<RequireRole role="LEARNER"><WordReading /></RequireRole>} />
          <Route path="/assessment/spelling" element={<RequireRole role="LEARNER"><Spelling /></RequireRole>} />
          <Route path="/activities/spelling-bee/en" element={<RequireRole role="LEARNER"><EnglishSpellingBee /></RequireRole>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
