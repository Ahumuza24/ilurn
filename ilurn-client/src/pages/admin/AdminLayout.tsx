import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, LayoutDashboard, Users } from 'lucide-react';
import { AppShell, type NavItem } from '../../components/AppShell';
import { useUserStore } from '../../lib/store';

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, to: '/dashboard/admin' },
  { label: 'Students', icon: Users, to: '/dashboard/admin/students' },
  { label: 'Content', icon: BookOpen, to: '/dashboard/admin/content' },
  { label: 'Analytics', icon: BarChart3, to: '/dashboard/admin/analytics' },
];

function sectionFor(pathname: string): { label: string; title: string; eyebrow: string } {
  if (pathname.includes('/students')) return { label: 'Students', title: 'Students', eyebrow: 'Manage learners' };
  if (pathname.includes('/content')) return { label: 'Content', title: 'Assessment Content', eyebrow: 'Test CMS' };
  if (pathname.includes('/analytics')) return { label: 'Analytics', title: 'Analytics', eyebrow: 'Insights' };
  return { label: 'Overview', title: 'Overview', eyebrow: 'Admin space' };
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { name } = useUserStore();
  const section = sectionFor(location.pathname);

  return (
    <AppShell
      brandSubtitle="Admin"
      navItems={navItems}
      active={section.label}
      eyebrow={section.eyebrow}
      title={section.title}
      user={{ name: name ?? 'Admin', emoji: '🧑‍🏫', subtitle: 'Administrator' }}
      onLogout={() => {
        void fetch('/auth/logout', { method: 'POST', credentials: 'include' });
        useUserStore.getState().logout();
        navigate('/login');
      }}
    >
      <Outlet />
    </AppShell>
  );
}
