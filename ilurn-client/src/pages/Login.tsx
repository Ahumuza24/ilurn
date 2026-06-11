import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useUserStore } from '../lib/store';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useUserStore(state => state.setAuth);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const response = await fetch('/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setError('Invalid email or password.');
      return;
    }

    const data = await response.json();
    setAuth(data.user);
    navigate(data.redirect_to);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/70 bg-card shadow-2xl">
        <CardHeader>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Badge variant="secondary">
              <LockKeyhole data-icon="inline-start" />
              Sign in
            </Badge>
            <Badge variant="outline">
              <ShieldCheck data-icon="inline-start" />
              RBAC
            </Badge>
          </div>
          <CardTitle className="text-3xl">Welcome back</CardTitle>
          <CardDescription>Use your learner or admin account. iLurn will open the right dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="login-email">
              Email
              <Input id="login-email" required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="login-password">
              Password
              <Input id="login-password" required type="password" value={password} onChange={event => setPassword(event.target.value)} />
            </label>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" size="lg" className="h-11">
              Log In
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
          <Separator className="my-6" />
          <Button variant="link" className="px-0" onClick={() => navigate('/register')}>
            New here? Create an account
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
