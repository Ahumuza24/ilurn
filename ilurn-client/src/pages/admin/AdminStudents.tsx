import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Download, Plus, UserPlus, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Student } from '../../lib/types';
import { cn } from '../../lib/utils';
import { bandClass, formatDate } from './adminUtils';

const emptyForm = { name: '', dob: '' };

export function AdminStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadStudents = async () => {
    setError('');
    const res = await fetch('/admin/students', { credentials: 'include' });
    if (!res.ok) {
      setError('Unable to load learner records.');
      return;
    }
    const data = await res.json();
    setStudents(data.students || []);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleExport = async () => {
    const res = await fetch('/admin/export?format=csv', { credentials: 'include' });
    if (!res.ok) {
      setError('Export failed.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ilurn-students.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/admin/students', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, dob: form.dob }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Unable to add this learner. Check the name and date of birth.');
        return;
      }
      setForm(emptyForm);
      setAdding(false);
      await loadStudents();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">All learners</h2>
          <p className="text-muted-foreground">{students.length} enrolled. Click a learner to view their assessments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
          <Button className="bg-violet-500 text-white hover:bg-violet-600" onClick={() => setAdding((open) => !open)}>
            {adding ? <X data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
            {adding ? 'Close' : 'Add student'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {adding && (
        <Card className="border-2 border-violet-200 bg-violet-50">
          <CardHeader>
            <CardTitle>New learner</CardTitle>
            <CardDescription>The age group and registration ID are generated automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium" htmlFor="new-name">
                Full name
                <Input id="new-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jamie Doe" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="new-dob">
                Date of birth
                <Input id="new-dob" required type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
              </label>
              <Button type="submit" disabled={saving} className="bg-violet-500 text-white hover:bg-violet-600">
                <Plus data-icon="inline-start" />
                {saving ? 'Adding…' : 'Add learner'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Reg ID</TableHead>
                <TableHead>Last Assessment</TableHead>
                <TableHead>Score Band</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow
                  key={student.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/dashboard/admin/students/${student.id}`)}
                >
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.age_group}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{student.registration_id}</TableCell>
                  <TableCell>{formatDate(student.last_assessment_date)}</TableCell>
                  <TableCell>
                    {student.score_band === 'N/A' ? (
                      <Badge variant="outline">Not started</Badge>
                    ) : (
                      <Badge variant="outline" className={cn(bandClass(student.score_band))}>{student.score_band}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <ChevronRight className="inline size-4" />
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No learners yet. Add your first student.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
