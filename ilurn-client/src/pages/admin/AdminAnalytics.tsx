import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Analytics } from '../../lib/types';
import { cn } from '../../lib/utils';
import { assessmentLabel, typeColor } from './adminUtils';

const bandColor: Record<string, string> = {
  Proficient: 'bg-emerald-500',
  Developing: 'bg-amber-500',
  Emerging: 'bg-rose-500',
};

export function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/admin/analytics', { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return <p className="mx-auto w-full max-w-6xl text-muted-foreground">Loading analytics…</p>;
  }

  const bandTotal = (Object.values(data.score_bands) as number[]).reduce((a, b) => a + b, 0);
  const maxTypeCount = Math.max(1, ...data.by_assessment_type.map((t) => t.count));
  const maxAge = Math.max(1, ...data.age_groups.map((a) => a.count));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Total Learners" value={data.total_learners} tint="bg-violet-50 border-violet-200" strip="bg-violet-500" valueClass="text-violet-600" />
        <Metric label="Assessments Taken" value={data.total_assessments} tint="bg-sky-50 border-sky-200" strip="bg-sky-500" valueClass="text-sky-600" />
        <Metric label="Learners Assessed" value={data.assessed_learners} tint="bg-emerald-50 border-emerald-200" strip="bg-emerald-500" valueClass="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score band distribution</CardTitle>
            <CardDescription>How learners are performing across all assessments.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {['Proficient', 'Developing', 'Emerging'].map((band) => {
              const count = data.score_bands[band] ?? 0;
              const pct = bandTotal ? Math.round((count / bandTotal) * 100) : 0;
              return (
                <div key={band}>
                  <div className="mb-1 flex items-center justify-between text-sm font-medium">
                    <span>{band}</span>
                    <span className="text-muted-foreground">{count} · {pct}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', bandColor[band])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {bandTotal === 0 && <p className="text-sm text-muted-foreground">No assessment data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By assessment type</CardTitle>
            <CardDescription>Completions and average score per activity.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.by_assessment_type.map((t) => {
              const color = typeColor(t.assessment_type);
              const pct = Math.round((t.count / maxTypeCount) * 100);
              return (
                <div key={t.assessment_type}>
                  <div className="mb-1 flex items-center justify-between text-sm font-medium">
                    <span>{assessmentLabel(t.assessment_type)}</span>
                    <span className="text-muted-foreground">{t.count} taken · avg {t.average_score}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', color.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.by_assessment_type.length === 0 && <p className="text-sm text-muted-foreground">No assessment data yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Learners by age group</CardTitle>
          <CardDescription>Distribution of enrolled learners.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.age_groups.map((a) => (
            <div key={a.age_group} className="rounded-xl border-2 border-violet-100 bg-violet-50 p-4">
              <p className="text-3xl font-bold text-violet-600">{a.count}</p>
              <p className="text-xs font-medium text-muted-foreground">{a.age_group}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round((a.count / maxAge) * 100)}%` }} />
              </div>
            </div>
          ))}
          {data.age_groups.length === 0 && <p className="text-sm text-muted-foreground">No learners enrolled yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tint, strip, valueClass }: { label: string; value: number; tint: string; strip: string; valueClass: string }) {
  return (
    <Card className={cn('relative overflow-hidden border-2', tint)}>
      <span className={cn('absolute inset-y-0 left-0 w-1.5', strip)} />
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn('text-3xl', valueClass)}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
