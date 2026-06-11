import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Gamepad2, Home, Pencil, Sparkles, Star, Trophy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '../lib/utils';
import { useUserStore } from '../lib/store';
import { ProgressInfo } from '../lib/types';
import { AppShell, type NavItem } from '../components/AppShell';
import { Avatar, avatarForAgeGroup } from '../components/Avatar';

const navItems: NavItem[] = [
  { label: 'Home', icon: Home, sectionId: 'top' },
  { label: 'Play', icon: Gamepad2, sectionId: 'activities' },
  { label: 'Progress', icon: Trophy, sectionId: 'progress' },
];

const activities = [
  {
    type: 'word-reading',
    path: '/assessment/word-reading',
    title: 'Word Reading',
    blurb: "Let's read some words together!",
    emoji: '📖',
    tile: 'bg-sky-500',
    strip: 'bg-sky-500',
    button: 'bg-sky-500 hover:bg-sky-600 text-white',
    cardTint: 'bg-sky-50 border-sky-200',
    cta: 'Start reading',
  },
  {
    type: 'spelling',
    path: '/assessment/spelling',
    title: 'Spelling Test',
    blurb: 'Listen carefully and type the word.',
    emoji: '✏️',
    tile: 'bg-violet-500',
    strip: 'bg-violet-500',
    button: 'bg-violet-500 hover:bg-violet-600 text-white',
    cardTint: 'bg-violet-50 border-violet-200',
    cta: 'Start spelling',
  },
  {
    type: 'spelling-bee',
    path: '/activities/spelling-bee/en',
    title: 'Spelling Bee',
    blurb: 'How many can you spell in a row?',
    emoji: '🐝',
    tile: 'bg-amber-500',
    strip: 'bg-amber-500',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    cardTint: 'bg-amber-50 border-amber-200',
    cta: 'Buzz in',
  },
] as const;

function activityLabel(type: string) {
  if (type === 'word-reading') return 'Word Reading';
  if (type === 'spelling-bee') return 'Spelling Bee';
  return 'Spelling Test';
}

export function LearnerDashboard() {
  const { name, user_id, age_group, setSessionId } = useUserStore();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressInfo[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user_id) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/users/${user_id}/progress`, { credentials: 'include' });
        if (!res.ok) return; // no progress yet / not reachable — leave the wall empty
        const data = await res.json();
        if (!cancelled) setProgress(data.progress || []);
      } catch {
        /* network/parse error — keep the dashboard usable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user_id, navigate]);

  const startAssessment = async (type: string, path: string) => {
    setError('');
    try {
      const res = await fetch('/sessions/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, assessment_type: type }),
      });
      if (res.ok) {
        const { session_id } = await res.json();
        setSessionId(session_id);
        navigate(path);
        return;
      }
      if (res.status === 401) {
        setError('Your session expired. Please log in again.');
        return;
      }
      setError("We couldn't start the activity. Please try again.");
    } catch {
      setError("Can't reach the server. Make sure iLurn is running, then try again.");
    }
  };

  const getStars = (band: string) => {
    if (band === 'Proficient') return 3;
    if (band === 'Developing') return 2;
    if (band === 'Emerging') return 1;
    return 0;
  };

  return (
    <AppShell
      brandSubtitle="Learner"
      navItems={navItems}
      eyebrow="Learner space"
      title="Your playground"
      user={{ name: name ?? 'Friend', emoji: avatarForAgeGroup(age_group), subtitle: `${progress.length} completed` }}
      onLogout={() => {
        void fetch('/auth/logout', { method: 'POST', credentials: 'include' });
        useUserStore.getState().logout();
        navigate('/login');
      }}
    >
      <div id="top" className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {/* Hero greeting */}
        <div className="flex flex-col items-start gap-4 py-2 sm:flex-row sm:items-center sm:gap-6">
          <Avatar emoji={avatarForAgeGroup(age_group)} size="xl" className="animate-float bg-violet-100 ring-4 ring-violet-200" />
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-violet-500">Welcome back</p>
            <h2 className="mt-1 text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
              Hi {name}! <span className="inline-block animate-wiggle">👋</span>
            </h2>
            <p className="mt-2 max-w-md text-base text-muted-foreground">
              Pick an activity below and iLurn will guide you with audio prompts.
            </p>
          </div>
        </div>

        {/* Activities */}
        <section id="activities" className="scroll-mt-24">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles />
            <h3 className="text-2xl font-semibold">Choose an activity</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <Card
                key={activity.type}
                className={cn(
                  'relative overflow-hidden border-2 transition hover:-translate-y-1 hover:shadow-xl',
                  activity.cardTint,
                )}
              >
                <span className={cn('absolute inset-x-0 top-0 h-2', activity.strip)} />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn('grid size-14 place-items-center rounded-2xl text-3xl text-white shadow-md', activity.tile)}>
                      {activity.emoji}
                    </span>
                    {activity.type === 'word-reading' && <BookOpen className="text-sky-500" />}
                    {activity.type === 'spelling' && <Pencil className="text-violet-500" />}
                    {activity.type === 'spelling-bee' && <Trophy className="text-amber-500" />}
                  </div>
                  <CardTitle className="text-2xl">{activity.title}</CardTitle>
                  <CardDescription>{activity.blurb}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    className={cn('w-full', activity.button)}
                    aria-label={activity.title}
                    onClick={() => startAssessment(activity.type, activity.path)}
                  >
                    {activity.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* Progress */}
        <Card id="progress" className="scroll-mt-24 border-border/70">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy />
              <CardTitle className="text-2xl">My Progress</CardTitle>
            </div>
            {progress.length > 0 && (
              <Badge variant="secondary">
                {progress.length} completed
              </Badge>
            )}
          </CardHeader>

          <CardContent>
          {progress.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/40 p-10 text-center">
              <span className="text-5xl">🌟</span>
              <p className="text-lg font-semibold">No stars yet</p>
              <p className="text-sm text-muted-foreground">Finish an activity to earn your first badge.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {progress.slice(0, 4).map((p, idx) => {
                const stars = getStars(p.score_band);
                return (
                  <div
                    key={idx}
                    className="flex animate-rise flex-col gap-3 rounded-xl border bg-card p-4"
                  >
                    <Badge variant="outline" className="w-fit">{activityLabel(p.assessment_type)}</Badge>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          size={26}
                          className={s <= stars ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}
                        />
                      ))}
                    </div>
                    <Progress value={(stars / 3) * 100} />
                    <p className="text-xs font-medium text-muted-foreground">{new Date(p.completed_at).toLocaleDateString()}</p>
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
