import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '../lib/utils';
import { Avatar } from './Avatar';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Navigate to a route. */
  to?: string;
  /** Smooth-scroll to an element id on the current page. */
  sectionId?: string;
}

interface AppShellProps {
  brandSubtitle?: string;
  navItems: NavItem[];
  active?: string;
  eyebrow?: string;
  title: ReactNode;
  headerExtra?: ReactNode;
  user: { name: string; emoji: string; subtitle?: string };
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({
  brandSubtitle,
  navItems,
  active,
  eyebrow,
  title,
  headerExtra,
  user,
  onLogout,
  children,
}: AppShellProps) {
  const navigate = useNavigate();
  const [activeLabel, setActiveLabel] = useState(active ?? navItems[0]?.label);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) setActiveLabel(active);
  }, [active]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleNav = (item: NavItem) => {
    setActiveLabel(item.label);
    if (item.to) {
      navigate(item.to);
    } else if (item.sectionId) {
      document.getElementById(item.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const Brand = (
    <div className="flex items-center gap-2.5">
      <span className="grid size-11 place-items-center rounded-xl bg-primary text-2xl text-primary-foreground shadow-sm">
        🐝
      </span>
      <div className="leading-tight">
        <p className="text-xl font-semibold">iLurn</p>
        {brandSubtitle && <Badge variant="secondary" className="mt-1">{brandSubtitle}</Badge>}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r bg-card/80 p-5 backdrop-blur md:flex">
        <div className="mb-6 px-1">{Brand}</div>
        <nav className="flex flex-1 flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = item.label === activeLabel;
            return (
              <Button
                key={item.label}
                variant={isActive ? 'default' : 'ghost'}
                onClick={() => handleNav(item)}
                className={cn(
                  'h-10 justify-start gap-3',
                )}
              >
                <item.icon data-icon="inline-start" />
                {item.label}
              </Button>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          onClick={onLogout}
          className="justify-start"
        >
          <LogOut data-icon="inline-start" />
          Log out
        </Button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="md:hidden">{Brand}</div>
          <div className="hidden flex-col md:flex">
            {eyebrow && <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{eyebrow}</span>}
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {headerExtra}
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                onClick={() => setMenuOpen((open) => !open)}
                className="h-auto gap-2 py-1 pl-1 pr-3"
              >
                <Avatar emoji={user.emoji} size="sm" ring={false} />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-medium">{user.name}</span>
                  {user.subtitle && <span className="block text-xs text-muted-foreground">{user.subtitle}</span>}
                </span>
              </Button>
              {menuOpen && (
                <Card className="absolute right-0 z-30 mt-2 w-48 animate-pop p-1.5 shadow-xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    {user.subtitle && <p className="text-xs text-muted-foreground">{user.subtitle}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={onLogout}
                    className="w-full justify-start"
                  >
                    <LogOut data-icon="inline-start" /> Log out
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-card/90 p-1.5 shadow-xl backdrop-blur md:hidden">
        {navItems.map((item) => {
          const isActive = item.label === activeLabel;
          return (
            <Button
              key={item.label}
              variant={isActive ? 'default' : 'ghost'}
              size="icon-lg"
              onClick={() => handleNav(item)}
              aria-label={item.label}
            >
              <item.icon />
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
