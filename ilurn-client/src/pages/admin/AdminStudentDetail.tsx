import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Hash } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StudentDetail } from '../../lib/types';
import { cn } from '../../lib/utils';
import { Avatar } from '../../components/Avatar';
import { assessmentLabel, bandClass, formatDate, typeColor } from './adminUtils';

export function AdminStudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/admin/students/${id}`, { credentials: 'include' });
      if (!res.ok) {
        setError('Unable to load this learner.');
        return;
      }
      const data = await res.json();
      if (!cancelled) setStudent(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const best = student?.results.reduce((max, r) => Math.max(max, r.raw_score), 0) ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Button variant="ghost" className="w-fit" onClick={() => navigate('/dashboard/admin/students')}>
        <ArrowLeft data-icon="inline-start" />
        Back to students
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {student && (
        <>
          <Card className="border-2 border-violet-200 bg-violet-50">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
              <Avatar emoji="🧒" size="xl" className="bg-white ring-4 ring-violet-200" />
              <div className="flex-1">
                <h2 className="text-3xl font-bold">{student.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{student.age_group}</Badge>
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Hash className="size-3.5" /> {student.registration_id}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <CalendarDays className="size-3.5" /> Enrolled {formatDate(student.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <Stat label="Assessments" value={student.results.length} valueClass="text-violet-600" />
                <Stat label="Best score" value={best} valueClass="text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment history</CardTitle>
              <CardDescription>Every assessment {student.name.split(' ')[0]} has completed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Letters</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Band</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.results.map((result) => {
                    const color = typeColor(result.assessment_type);
                    return (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className={cn('size-2.5 rounded-full', color.bar)} />
                            {assessmentLabel(result.assessment_type)}
                          </span>
                        </TableCell>
                        <TableCell className={cn('font-bold', color.text)}>{result.raw_score}</TableCell>
                        <TableCell className="text-muted-foreground">{result.letter_score}</TableCell>
                        <TableCell className="text-muted-foreground">{result.word_score}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(bandClass(result.score_band))}>{result.score_band}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(result.completed_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {student.results.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No assessments completed yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: number; valueClass?: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3 text-center">
      <p className={cn('text-2xl font-bold', valueClass)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
