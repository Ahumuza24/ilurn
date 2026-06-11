import { type FormEvent, type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useUserStore, type UserRole } from '../lib/store';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('LEARNER');
  const [dob, setDob] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useUserStore(state => state.setAuth);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const payload = role === 'LEARNER'
      ? { name, email, password, role, dob, parent_email: parentEmail || undefined }
      : { name, email, password, role, admin_code: adminCode };

    const response = await fetch('/auth/signup', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError('Please check the account details and try again.');
      return;
    }

    const data = await response.json();
    setAuth(data.user);
    navigate(data.redirect_to);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="hidden border-border/70 bg-card/80 shadow-xl lg:flex">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              <Sparkles data-icon="inline-start" />
              Phase 1
            </Badge>
            <CardTitle className="text-3xl">A cleaner start for every learner.</CardTitle>
            <CardDescription>
              iLurn now keeps learner and admin access separate, with secure account routing and editable test content.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Learners</p>
              <p className="text-sm text-muted-foreground">Create an account with date of birth and start Phase 1 activities.</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Admins</p>
              <p className="text-sm text-muted-foreground">Use the admin code to access records and manage assessment items.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-3xl">Create account</CardTitle>
                <CardDescription>Choose the right role and iLurn will route you to the correct dashboard.</CardDescription>
              </div>
              <Badge variant="outline">
                <ShieldCheck data-icon="inline-start" />
                Secure
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                {(['LEARNER', 'ADMIN'] as UserRole[]).map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant={role === option ? 'default' : 'ghost'}
                    onClick={() => setRole(option)}
                    className="h-10"
                  >
                    {option === 'LEARNER' ? 'Learner' : 'Admin'}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Your Name" htmlFor="learner-name">
                  <Input id="learner-name" required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Alex" />
                </Field>
                <Field label="Email" htmlFor="account-email">
                  <Input id="account-email" required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
                </Field>
              </div>

              <Field label="Password" htmlFor="account-password">
                <Input id="account-password" required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} />
              </Field>

              {role === 'LEARNER' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Date of Birth" htmlFor="learner-dob">
                    <Input id="learner-dob" required type="date" value={dob} onChange={event => setDob(event.target.value)} />
                  </Field>
                  <Field label="Parent Email (Optional)" htmlFor="parent-email">
                    <Input id="parent-email" type="email" value={parentEmail} onChange={event => setParentEmail(event.target.value)} placeholder="parent@example.com" />
                  </Field>
                </div>
              ) : (
                <Field label="Admin Signup Code" htmlFor="admin-code">
                  <Input id="admin-code" required type="password" value={adminCode} onChange={event => setAdminCode(event.target.value)} />
                </Field>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" size="lg" className="h-11">
                Create Account
                <ArrowRight data-icon="inline-end" />
              </Button>
            </form>

            <Separator className="my-6" />
            <Button variant="link" className="px-0" onClick={() => navigate('/login')}>
              Already have an account? Log in
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-sm font-medium', className)} htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}
