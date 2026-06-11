import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Analytics } from '../../lib/types';
import { cn } from '../../lib/utils';
import { assessmentLabel, bandClass, formatDate } from './adminUtils';

export function AdminOverview() {
  const navigate = useNavigate();
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Total Learners" value={data?.total_learners ?? 0} tint="bg-violet-50 border-violet-200" strip="bg-violet-500" valueClass="text-violet-600" />
        <Metric label="Assessments Taken" value={data?.total_assessments ?? 0} tint="bg-sky-50 border-sky-200" strip="bg-sky-500" valueClass="text-sky-600" />
        <Metric label="Learners Assessed" value={data?.assessed_learners ?? 0} tint="bg-emerald-50 border-emerald-200" strip="bg-emerald-500" valueClass="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLink color="bg-violet-500" icon={<Users />} title="Students" desc="View & add learners" onClick={() => navigate('/dashboard/admin/students')} />
        <QuickLink color="bg-amber-500" icon={<BookOpen />} title="Content" desc="Edit assessment items" onClick={() => navigate('/dashboard/admin/content')} />
        <QuickLink color="bg-sky-500" icon={<BarChart3 />} title="Analytics" desc="Performance insights" onClick={() => navigate('/dashboard/admin/analytics')} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>The latest assessments completed by learners.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recent ?? []).map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{assessmentLabel(row.assessment_type)}</TableCell>
                  <TableCell className="font-bold">{row.raw_score}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(bandClass(row.score_band))}>{row.score_band}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.completed_at)}</TableCell>
                </TableRow>
              ))}
              {(!data || data.recent.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No activity yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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

function QuickLink({ color, icon, title, desc, onClick }: { color: string; icon: ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={cn('grid size-11 place-items-center rounded-xl text-white', color)}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
