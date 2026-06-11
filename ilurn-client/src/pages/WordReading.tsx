import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUserStore } from '../lib/store';
import { AudioInstructor } from '../lib/AudioInstructor';
import { QuestionResponse } from '../lib/types';

interface Question {
  id: string;
  type: string;
  text: string;
}

export function WordReading() {
  const { user_id, session_id, age_group } = useUserStore();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFinished, setIsFinished] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [instructionFallback, setInstructionFallback] = useState('');
  const instructor = AudioInstructor.getInstance();
  const startTimeRef = useRef<number>(Date.now());
  const lastSpokenIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user_id || !session_id) {
      navigate('/login');
      return;
    }
    fetch(`/assessments/word-reading/questions?age_group=${age_group || 'PUPIL'}`, { credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        setQuestions(data.questions);
        startTimeRef.current = Date.now();
      });
  }, [age_group, navigate, user_id, session_id]);

  useEffect(() => {
    const question = questions[currentIndex];
    if (!question || isFinished || !audioStarted) return;
    if (lastSpokenIndexRef.current === currentIndex) return;
    playCurrentPrompt();
  }, [audioStarted, currentIndex, isFinished, questions]);

  useEffect(() => {
    if (questions.length === 0 || isFinished || !audioStarted) return;

    setTimeLeft(10);
    const timer = setInterval(() => {
      setTimeLeft(value => {
        if (value <= 1) {
          handleNext(false);
          return 10;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [audioStarted, currentIndex, questions, isFinished]);

  const getCurrentPrompt = () => {
    const question = questions[currentIndex];
    if (!question) return '';
    return question.type === 'letter'
      ? `Read this letter aloud: ${question.text}`
      : `Read this word aloud: ${question.text}`;
  };

  const playCurrentPrompt = () => {
    const prompt = getCurrentPrompt();
    if (!prompt) return;
    lastSpokenIndexRef.current = currentIndex;
    setInstructionFallback('');
    if (!instructor.play(prompt)) setInstructionFallback(`Audio is unavailable. ${prompt}`);
  };

  const startAudio = () => {
    setAudioStarted(true);
    startTimeRef.current = Date.now();
    playCurrentPrompt();
  };

  const handleNext = (is_correct: boolean) => {
    const elapsed = Date.now() - startTimeRef.current;
    const newResponse = {
      question_id: questions[currentIndex].id,
      response: is_correct ? 'CORRECT' : 'INCORRECT',
      is_correct,
      response_time_ms: elapsed,
    };

    setResponses(previous => [...previous, newResponse]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(index => index + 1);
      startTimeRef.current = Date.now();
    } else {
      finishAssessment([...responses, newResponse]);
    }
  };

  const finishAssessment = async (finalResponses: QuestionResponse[]) => {
    setIsFinished(true);
    await fetch('/assessments/word-reading/submit', {
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
            <CardTitle className="text-3xl">Word Reading</CardTitle>
            <CardDescription>Press start so iLurn can read each prompt aloud.</CardDescription>
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
          <div className="flex w-full max-w-2xl items-center justify-between gap-3">
            <Button variant="outline" onClick={() => navigate('/dashboard/learner')}>
              <ArrowLeft data-icon="inline-start" />
              Exit
            </Button>
            <Badge variant="secondary">Word Reading</Badge>
            <Badge variant="outline">{currentIndex + 1} / {questions.length}</Badge>
          </div>

          <Card className="w-full max-w-2xl shadow-xl">
            <CardContent className="flex flex-col items-center p-8 sm:p-12">
              <Progress value={(timeLeft / 10) * 100} className="mb-8" />

              {instructionFallback && (
                <Alert className="mb-6">
                  <AlertDescription>{instructionFallback}</AlertDescription>
                </Alert>
              )}

              <Button variant="outline" onClick={playCurrentPrompt} className="mb-8">
                <Volume2 data-icon="inline-start" />
                Hear prompt
              </Button>

              <div className="mb-12 text-[96px] font-black leading-none tracking-tight sm:text-[120px]" style={{ fontFamily: '"Century Gothic", "Futura PT", sans-serif' }}>
                {questions[currentIndex].text}
              </div>

              <div className="mb-8 flex max-h-24 w-full flex-wrap justify-center gap-2 overflow-y-auto">
                {questions.map((question, index) => (
                  <Badge key={question.id} variant={index === currentIndex ? 'default' : index < currentIndex ? 'outline' : 'secondary'}>
                    {question.text}
                  </Badge>
                ))}
              </div>

              <div className="flex w-full gap-3">
                <Button variant="destructive" onClick={() => handleNext(false)} className="flex-1">
                  Skip (Incorrect)
                </Button>
                <Button onClick={() => handleNext(true)} className="flex-1">
                  Next (Correct)
                </Button>
              </div>

              <p className="mt-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Assessor: tap correct / incorrect for each prompt
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
