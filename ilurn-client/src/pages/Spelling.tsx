import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useUserStore } from '../lib/store';
import { AudioInstructor } from '../lib/AudioInstructor';
import { QuestionResponse } from '../lib/types';

interface SpellQuestion {
  id: string;
  type: string;
  text: string;
  sentence: string;
}

export function Spelling() {
  const { user_id, session_id, age_group } = useUserStore();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<SpellQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [inputVal, setInputVal] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [instructionFallback, setInstructionFallback] = useState('');
  const instructor = AudioInstructor.getInstance();
  const startTimeRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSpokenIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user_id || !session_id) {
      navigate('/login');
      return;
    }
    fetch(`/assessments/spelling/questions?age_group=${age_group || 'PUPIL'}`, { credentials: 'include' })
      .then(response => response.json())
      .then(data => setQuestions(data.questions));
  }, [age_group, navigate, user_id, session_id]);

  useEffect(() => {
    if (questions.length > 0 && !isFinished && audioStarted) {
      if (lastSpokenIndexRef.current === currentIndex) return;
      playPrompt();
      startTimeRef.current = Date.now();
      inputRef.current?.focus();
    }
  }, [audioStarted, currentIndex, questions, isFinished]);

  useEffect(() => {
    if (questions.length === 0 || isFinished || !audioStarted) return;
    setTimeLeft(15);
    const timer = setInterval(() => {
      setTimeLeft(value => {
        if (value <= 1) {
          handleNext(inputVal);
          return 15;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [audioStarted, currentIndex, questions, isFinished]);

  const playPrompt = () => {
    const question = questions[currentIndex];
    if (!question) return;
    const sequence = [question.text, question.sentence, question.text];
    lastSpokenIndexRef.current = currentIndex;
    setInstructionFallback('');
    if (!instructor.enqueue(sequence)) setInstructionFallback(`Audio is unavailable. ${sequence.join('. ')}`);
  };

  const startAudio = () => {
    setAudioStarted(true);
    startTimeRef.current = Date.now();
    playPrompt();
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleNext = async (value: string) => {
    const question = questions[currentIndex];
    const is_correct = value.trim().toLowerCase() === question.text.toLowerCase();
    const elapsed = Date.now() - startTimeRef.current;
    const newResponse = {
      question_id: question.id,
      response: value,
      is_correct,
      response_time_ms: elapsed,
    };

    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);
    setInputVal('');

    let consecutiveWrong = 0;
    for (let index = updatedResponses.length - 1; index >= 0; index -= 1) {
      if (!updatedResponses[index].is_correct) consecutiveWrong += 1;
      else break;
    }

    if (consecutiveWrong >= 10 || currentIndex >= questions.length - 1) {
      finishAssessment(updatedResponses);
    } else {
      setCurrentIndex(index => index + 1);
    }
  };

  const finishAssessment = async (finalResponses: QuestionResponse[]) => {
    setIsFinished(true);
    await fetch('/assessments/spelling/submit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, session_id, responses: finalResponses }),
    });

    await fetch(`/sessions/${session_id}/end`, { method: 'PATCH', credentials: 'include' });
    navigate('/dashboard/learner');
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
            <CardTitle className="text-3xl">Spelling Test</CardTitle>
            <CardDescription>Press start so iLurn can say each word, sentence, and word again.</CardDescription>
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
      {!isFinished && (
        <>
          <div className="flex w-full max-w-3xl items-center justify-between gap-3">
            <Button variant="outline" onClick={() => navigate('/dashboard/learner')}>
              <ArrowLeft data-icon="inline-start" />
              Exit
            </Button>
            <Badge variant="secondary">Spelling Test</Badge>
            <Badge variant="outline">{currentIndex + 1} / {questions.length}</Badge>
          </div>

          <Card className="w-full max-w-3xl shadow-xl">
            <CardContent className="flex flex-col items-center p-8 sm:p-12">
              <Progress value={(timeLeft / 15) * 100} className="mb-8" />
              <Button variant="outline" onClick={playPrompt} className="mb-8">
                <Volume2 data-icon="inline-start" />
                Hear again
              </Button>

              {instructionFallback && (
                <Alert className="mb-6">
                  <AlertDescription>{instructionFallback}</AlertDescription>
                </Alert>
              )}

              <form
                className="w-full"
                onSubmit={event => {
                  event.preventDefault();
                  handleNext(inputVal);
                }}
              >
                <Input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={event => setInputVal(event.target.value)}
                  className="pencil-cursor h-auto border-0 border-b-4 bg-transparent pb-4 text-center text-[72px] font-medium shadow-none focus-visible:ring-0 sm:text-[80px]"
                  style={{ fontFamily: '"Century Gothic", "Futura PT", sans-serif' }}
                  placeholder="..."
                  autoFocus
                  autoComplete="off"
                />
              </form>
              <p className="mt-8 text-xs font-medium uppercase tracking-widest text-muted-foreground">Type what you hear and press enter</p>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
