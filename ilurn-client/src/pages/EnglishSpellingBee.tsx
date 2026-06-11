import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Volume2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AudioInstructor } from '../lib/AudioInstructor';
import { useUserStore } from '../lib/store';

interface BeeQuestion {
  id: string;
  text: string;
  sentence?: string;
}

export function EnglishSpellingBee() {
  const { user_id, session_id } = useUserStore();
  const [questions, setQuestions] = useState<BeeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [streak, setStreak] = useState(0);
  const [wordsCorrect, setWordsCorrect] = useState(0);
  const [feedback, setFeedback] = useState<'pending' | 'correct' | 'wrong'>('pending');
  const [encouragement, setEncouragement] = useState('');
  const [audioStarted, setAudioStarted] = useState(false);
  const [instructionFallback, setInstructionFallback] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIndexRef = useRef<number | null>(null);
  const instructor = AudioInstructor.getInstance();

  useEffect(() => {
    if (!user_id || !session_id) {
      navigate('/dashboard/learner');
      return;
    }
    fetch('/assessments/spelling-bee/questions', { credentials: 'include' })
      .then(response => response.json())
      .then(data => setQuestions(data.questions || []));
  }, [user_id, session_id, navigate]);

  useEffect(() => {
    if (questions.length > 0 && audioStarted && lastSpokenIndexRef.current !== index) playWord();
    inputRef.current?.focus();
  }, [audioStarted, index, questions]);

  const playWord = () => {
    const question = questions[index];
    if (!question) return;
    const sequence = question.sentence
      ? [question.text, question.sentence, question.text]
      : [`Spell the word: ${question.text}`];
    lastSpokenIndexRef.current = index;
    setInstructionFallback('');
    if (!instructor.enqueue(sequence)) setInstructionFallback(`Audio is unavailable. ${sequence.join('. ')}`);
  };

  const startAudio = () => {
    setAudioStarted(true);
    playWord();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const checkAnswer = async (event: FormEvent) => {
    event.preventDefault();
    const question = questions[index];
    if (!question) return;
    if (input.trim().toLowerCase() === question.text.toLowerCase()) {
      setFeedback('correct');
      const newScore = wordsCorrect + 1;
      setStreak(value => value + 1);
      setWordsCorrect(newScore);
      if (newScore % 5 === 0) {
        const message = `Amazing! ${newScore} words correct in a row! Keep going!`;
        setEncouragement(message);
        instructor.enqueue(['Correct!', message]);
      } else {
        setEncouragement('');
        instructor.play('Correct!');
      }
      setTimeout(async () => {
        setInput('');
        setFeedback('pending');
        if (index < questions.length - 1) {
          setIndex(value => value + 1);
        } else {
          instructor.play('You finished all the words! Great job!');
          await fetch('/assessments/spelling-bee/submit', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, session_id, score: newScore }),
          });
          await fetch(`/sessions/${session_id}/end`, { method: 'PATCH', credentials: 'include' });
          navigate('/dashboard/learner');
        }
      }, 1500);
    } else {
      setFeedback('wrong');
      setStreak(0);
      setEncouragement('');
      instructor.play('Try again!');
      setTimeout(() => setFeedback('pending'), 1500);
    }
  };

  if (questions.length === 0) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!audioStarted) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-xl text-center shadow-xl">
          <CardHeader>
            <Badge variant="secondary" className="mx-auto mb-2">Audio required</Badge>
            <CardTitle className="text-3xl">Spelling Bee</CardTitle>
            <CardDescription>Press start so iLurn can read each spelling word aloud.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button onClick={startAudio} size="lg">
              <Volume2 data-icon="inline-start" />
              Start Audio
            </Button>
            {instructionFallback && (
              <Alert>
                <AlertDescription>{instructionFallback}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-4">
      <div className="flex w-full max-w-2xl items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate('/dashboard/learner')}>
          <ArrowLeft data-icon="inline-start" />
          Exit
        </Button>
        <Badge variant="secondary">Spelling Bee</Badge>
        <Badge variant="outline">
          <Flame data-icon="inline-start" />
          {streak}
        </Badge>
      </div>

      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="flex flex-col items-center p-8 sm:p-12">
          <Button onClick={playWord} size="icon-lg" className="mb-8">
            <Volume2 />
          </Button>

          {instructionFallback && (
            <Alert className="mb-6">
              <AlertDescription>{instructionFallback}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={checkAnswer} className="w-full">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={event => setInput(event.target.value)}
              className="h-auto border-0 border-b-4 bg-transparent pb-4 text-center text-6xl font-medium shadow-none focus-visible:ring-0"
              style={{ fontFamily: '"Century Gothic", "Futura PT", sans-serif' }}
              placeholder="..."
            />
          </form>

          <div className="mt-8 flex h-24 w-full flex-col items-center justify-center gap-2">
            {feedback === 'correct' && <Badge>Correct</Badge>}
            {feedback === 'wrong' && <Badge variant="destructive">Try again</Badge>}
            {feedback === 'pending' && <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Type what you hear and press enter</p>}
            {encouragement && <p className="animate-pop text-center text-sm font-semibold">{encouragement}</p>}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
