# iLurn — Claude Code Executable PRD

**Product:** iLurn by Learning Ltd  
**Stack:** React.js + Vite · TailwindCSS + shadcn/ui · Python FastAPI · SQLite · MediaPipe · TensorFlow Lite · Local LLM (Gemma)  
**Target Learners:** Ages 1–18 · Mobile-first · Offline-capable  
**Architecture:** Clean Architecture + DDD · Modular for phased AI expansion

---

## Project Bootstrap (Run Once Before Any Phase)

```bash
# Frontend
npm create vite@latest ilurn-client -- --template react-ts
cd ilurn-client && npm install tailwindcss @shadcn/ui react-router-dom zustand

# Backend
python -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn sqlalchemy pydantic alembic python-multipart

# Folder structure to scaffold
ilurn/
├── ilurn-client/          # React + Vite frontend
│   └── src/
│       ├── domains/       # assessment | tracking | classification | auth
│       ├── components/    # shared UI primitives
│       ├── pages/         # route-level screens
│       └── lib/           # api client, utils
└── ilurn-api/             # FastAPI backend
    ├── domains/           # assessment | tracking | classification | users
    ├── routers/           # HTTP layer only — no business logic
    ├── models/            # SQLAlchemy ORM models
    └── migrations/        # Alembic
```

**Done when:** `npm run dev` serves the React shell and `uvicorn main:app` starts the API with `/health` returning 200.

---

## Phase 1 — Core Assessment System + Dashboards

**Goal:** Functional WRAT 4–style assessment (Word Reading + Spelling), basic user and admin dashboards, English Spelling Bee, and audio instruction support.

### Tasks

- [ ] **1.1 Database schema** — Create SQLAlchemy models: `User`, `Session`, `AssessmentResult`, `QuestionResponse`
  - `User`: id, name, age_group (TODDLER|PRE_PRIMARY|PUPIL|STUDENT), registration_id (unique), created_at
  - `AssessmentResult`: id, user_id, assessment_type, raw_score, letter_score, word_score, completed_at
  - `QuestionResponse`: id, result_id, question_id, response, is_correct, response_time_ms
  - Run `alembic revision --autogenerate -m "phase1_schema"` → verify migration file → `alembic upgrade head`

- [ ] **1.2 WRAT 4 Word Reading subtest API**
  - `GET /assessments/word-reading/questions?age_group=PUPIL` → returns ordered word list (55 words + 15 letters) with difficulty tags
  - `POST /assessments/word-reading/submit` → body: `{user_id, responses: [{question_id, response, response_time_ms}]}` → returns `{raw_score, letter_score, word_score, apply_5_rule, apply_10_rule}`
  - Implement 10 RULE (stop after 10 consecutive wrong) and 5 RULE (fallback to letter reading) as pure domain functions in `domains/assessment/scoring.py`
  - Verify: `curl POST /assessments/word-reading/submit` with mock payload returns correct score object

- [ ] **1.3 WRAT 4 Spelling subtest API**
  - `GET /assessments/spelling/questions?age_group=PUPIL` → ordered spelling word list with audio cue sentences
  - `POST /assessments/spelling/submit` → same structure as word reading; apply same 10 RULE / 5 RULE logic
  - Verify: Submit 10 consecutive wrong responses → API returns early with `discontinued: true`

- [ ] **1.4 User registration + session API**
  - `POST /users/register` → `{name, dob, parent_email?}` → returns `{user_id, registration_id, age_group}`
  - `POST /sessions/start` → `{user_id, assessment_type}` → returns `{session_id, started_at}`
  - `PATCH /sessions/{id}/end` → records `ended_at`, computes duration
  - Verify: Register a user, start a session, end it — all three records persist in SQLite

- [ ] **1.5 Assessment screen — Word Reading UI**
  - Route: `/assessment/word-reading`
  - Display letters/words in **Century Gothic** font (embed via Google Fonts or local), large viewport-filling text
  - Auto-play audio instruction on mount using Web Speech API (`SpeechSynthesisUtterance`)
  - 10-second timer per word displayed as a shrinking progress bar; auto-advance on timeout
  - Highlight active word; dim/grey completed words
  - Verify: Timer counts down, word advances, audio fires on load

- [ ] **1.6 Assessment screen — Spelling UI**
  - Route: `/assessment/spelling`
  - Audio plays word + sentence + word again (Web Speech API)
  - User types response into a large styled input; cursor changes to pencil SVG icon during writing phase
  - 15-second timer per word
  - On submit: record response, move to next word
  - Verify: Audio sequence fires correctly; response recorded with timestamp delta

- [ ] **1.7 English Spelling Bee UI**
  - Route: `/activities/spelling-bee/en`
  - Word spoken aloud; user types spelling; immediate "correct / try again" feedback using animated emoji (✅ / 😅)
  - Streak counter displayed; encouragement message every 5 correct
  - Verify: Correct answer increments streak; wrong shows gentle retry prompt

- [ ] **1.8 Learner Dashboard**
  - Route: `/dashboard/learner`
  - Age-appropriate greeting with avatar (emoji-based for young learners)
  - Cards: "Start Assessment", "Spelling Bee", "My Progress"
  - "My Progress" shows last assessment score as a visual star/badge system — no raw numbers shown to learner
  - Verify: Cards navigate to correct routes; progress card loads last result from API

- [ ] **1.9 Admin Dashboard (basic)**
  - Route: `/dashboard/admin` (protected by simple PIN for MVP)
  - Table: students list with columns — Name, Age Group, Registration ID, Last Assessment Date, Score Band (Emerging / Developing / Proficient)
  - Score band logic in `domains/classification/score_banding.py` — no magic numbers in UI
  - Export CSV button: `GET /admin/export?format=csv`
  - Verify: Table loads; CSV download returns correct headers and data

- [ ] **1.10 Audio instruction system**
  - Create `AudioInstructor` service in `src/lib/AudioInstructor.ts`
  - Wraps Web Speech API with queue, language param (`en` for Phase 1), playback controls (play, pause, replay)
  - Graceful fallback: if speech unavailable, show text instruction panel instead
  - Verify: Works on Chrome mobile; falls back silently on devices without speech support

**Phase 1 Done When:**
- [ ] A learner can register, complete a Word Reading + Spelling assessment, and see a badge on their dashboard
- [ ] Admin can view the student list and export it as CSV
- [ ] All API routes return correct data; `alembic upgrade head` runs clean

---

## Phase 2 — Behaviour Tracking (Cursor + Timing)

**Goal:** Capture response timing and cursor/touch movement during assessments; store as behavioural signal data; surface basic attention metrics in admin dashboard.

### Tasks

- [ ] **2.1 Behaviour schema**
  - New model: `BehaviourEvent`: id, session_id, event_type (CURSOR_MOVE|HESITATION|TOUCH|RESPONSE_TIME), payload JSON, timestamp_ms
  - Migration: `alembic revision -m "phase2_behaviour"` → `alembic upgrade head`

- [ ] **2.2 Client-side event collector**
  - `src/lib/BehaviourCollector.ts` — singleton that buffers events in memory
  - Listens to: `mousemove` (sample every 100ms), `touchmove`, `click`, `keydown`
  - Detects hesitation: cursor stationary > 3s over an interactive element → emit `HESITATION` event
  - Flushes buffer to `POST /tracking/events` every 30 events or on session end
  - Verify: Open DevTools Network tab during assessment — events POST in batches

- [ ] **2.3 Tracking API**
  - `POST /tracking/events` → body: `{session_id, events: [BehaviourEvent]}` → bulk insert, return `{accepted: N}`
  - `GET /tracking/summary/{session_id}` → returns `{avg_response_time_ms, hesitation_count, total_events}`
  - Verify: Submit 50 mock events → summary endpoint returns correct aggregates

- [ ] **2.4 Response time analytics**
  - `domains/tracking/ResponseTimeAnalyser.py` — pure functions:
    - `compute_percentiles(times: list[int]) -> {p25, p50, p75, p90}`
    - `flag_outliers(times, threshold_ms=8000) -> list[int]` (unusually slow responses)
  - Called during `POST /assessments/*/submit` to enrich result with timing profile
  - Verify: Unit test — list with one 9000ms response is flagged; percentiles correct

- [ ] **2.5 Admin dashboard — attention metrics panel**
  - Add "Session Detail" page: `/admin/students/{id}/session/{session_id}`
  - Show: response time line chart (recharts), hesitation count badge, slow-response flag list
  - Verify: Chart renders with mock data; hesitation badge shows correct count

**Phase 2 Done When:**
- [ ] Cursor and timing events are captured during live assessment without UI lag
- [ ] Admin session detail page shows response time chart and hesitation count
- [ ] `GET /tracking/summary/{session_id}` returns correct aggregates

---

## Phase 3 — Camera Integration (Face + Eye Tracking)

**Goal:** Opt-in camera capture using MediaPipe; detect facial expressions and eye focus; generate emotional timeline per session. No raw video stored.

### Tasks

- [ ] **3.1 Consent gate component**
  - `CameraConsentModal` component — shown before any camera-dependent feature
  - Stores consent decision in localStorage keyed to `user_id`
  - If consent denied: all camera features disabled silently; no error shown
  - Verify: Declining consent persists across page reload; camera never activates

- [ ] **3.2 MediaPipe face mesh integration**
  - Install: `npm install @mediapipe/face_mesh @mediapipe/camera_utils`
  - `src/lib/FaceTracker.ts` — initialises FaceMesh, streams from `navigator.mediaDevices.getUserMedia`
  - Processes every 5th frame only (performance budget for low-end devices)
  - Emits typed events: `FaceEvent {type: 'FOCUS'|'DISTRACTION'|'CONFUSION'|'FRUSTRATION'|'EXCITEMENT', confidence: number, timestamp_ms: number}`
  - No raw frames stored; only event objects
  - Verify: With camera active, console emits face events; no video blob in memory after 10s

- [ ] **3.3 Eye movement tracker**
  - Extend `FaceTracker` to compute gaze vector from iris landmarks (MediaPipe)
  - Classify gaze: `ON_SCREEN`, `OFF_SCREEN`, `RAPID_SCAN`
  - Emit `EyeEvent {type: GazeClassification, duration_ms: number}`
  - Verify: Looking away from screen for 2s emits `OFF_SCREEN` event

- [ ] **3.4 Liveness / authenticity check**
  - `AuthenticityDetector.ts` — uses blink detection (EAR < 0.2 threshold) and head pose estimation
  - Emits `LIVENESS_CONFIRMED` after detecting ≥ 2 natural blinks within 30s
  - If no liveness confirmed by assessment question 5: show subtle "Are you there?" prompt
  - Verify: Cover camera → no liveness event; uncover and blink → event fires

- [ ] **3.5 Emotional timeline API**
  - New model: `EmotionalEvent`: id, session_id, emotion_type, confidence, gaze_type, timestamp_ms
  - `POST /tracking/emotion-events` → bulk insert (same pattern as behaviour events)
  - `GET /tracking/emotion-timeline/{session_id}` → returns time-ordered list of emotion + gaze events
  - Verify: 20 mock events posted → timeline returns them sorted by timestamp

- [ ] **3.6 Admin — emotional timeline visualisation**
  - Add emotion timeline chart to session detail page (recharts scatter plot; x = time, y = emotion enum, colour = emotion type)
  - Tooltip shows confidence score
  - Verify: Chart renders; hovering a point shows correct emotion label and confidence

- [ ] **3.7 Graceful camera fallback**
  - All camera-dependent features wrapped in `try/catch` with silent fallback
  - `useCameraAvailable()` hook returns `{available: boolean, reason?: string}`
  - Assessment proceeds normally if camera unavailable; tracking data simply absent
  - Verify: Block camera permission in browser → assessment completes without errors

**Phase 3 Done When:**
- [ ] Consented user has face + eye events captured during assessment
- [ ] Emotional timeline renders in admin session detail
- [ ] All camera failures degrade gracefully; no broken UX

---

## Phase 4 — AI Personalisation (Local LLM + Learning Classification)

**Goal:** Classify each learner into a learning disability profile (Dyslexia, Dyscalculia, etc.) and learning style (Visual, Auditory, Kinaesthetic); generate personalised feedback via local Gemma LLM; all offline-capable.

### Tasks

- [ ] **4.1 Classification engine**
  - `ilurn-api/domains/classification/LearningClassifier.py`
  - Inputs: `{response_times, accuracy_by_question_type, hesitation_count, emotion_profile, cursor_speed}`
  - Rule-based v1 (ML upgrade in future phase):
    - Dyslexia signals: low word-reading score + high hesitation on letter sequences
    - Dyscalculia signals: low PIPs score + long response time on number questions
    - Dysgraphia signals: high hesitation during spelling writing tasks
    - APD signals: poor performance on audio-instruction-only tasks
  - Output: `{primary_ld: LDType|null, confidence: float, learning_style: [visual|auditory|kinaesthetic], recommendations: list[str]}`
  - Verify: Unit tests for each LD pattern using crafted input fixtures

- [ ] **4.2 Classification API**
  - `POST /classification/run` → `{session_id}` → triggers classifier, stores result in `LearningProfile` model
  - `GET /classification/profile/{user_id}` → returns latest profile with LD type, style, and recommendations
  - `LearningProfile` model: id, user_id, ld_type, ld_confidence, learning_style JSON array, recommendations JSON, created_at
  - Verify: Run classifier on a seeded session → profile stored → GET returns it

- [ ] **4.3 Local LLM (Gemma) integration**
  - Install: `pip install llama-cpp-python` (for GGUF Gemma model)
  - `ilurn-api/domains/ai/FeedbackGenerator.py`
    - `generate_feedback(profile: LearningProfile, age_group: AgeGroup) -> str`
    - System prompt enforces: age-appropriate language, encouragement over criticism, actionable next step
    - Age rules: TODDLER/PRE_PRIMARY → max 10 words, emoji-heavy; PUPIL → 2–3 sentences; STUDENT → paragraph
  - All inference runs locally; no external API call
  - Verify: Call `generate_feedback` with a PUPIL Dyslexia profile → returns ≤ 3 encouraging sentences

- [ ] **4.4 Feedback display — learner view**
  - Post-assessment: animated results screen with large emoji mascot
  - Shows AI-generated feedback text (age-gated verbosity)
  - Shows learning style icon (eye = visual, ear = auditory, hand = kinaesthetic)
  - No raw scores displayed to learner — only encouragement + one recommended activity
  - Verify: Feedback screen renders after assessment submit; text matches age group rules

- [ ] **4.5 Admin — learning profile panel**
  - Add "Learning Profile" tab to student detail page
  - Shows: LD classification + confidence bar, learning style tags, full recommendation list
  - "Re-run classification" button → `POST /classification/run`
  - Verify: Profile tab renders; re-run button triggers new classification and refreshes UI

- [ ] **4.6 Offline capability audit**
  - Service Worker: cache all static assets + API responses for `/assessment/*` and `/classification/*`
  - IndexedDB queue for `POST /tracking/events` when offline → sync on reconnect
  - Verify: Disconnect network → complete full assessment → reconnect → events sync to server

**Phase 4 Done When:**
- [ ] Classification runs after every assessment session and stores a profile
- [ ] Learner sees age-appropriate AI feedback on results screen
- [ ] Admin sees LD classification with confidence score
- [ ] Full assessment flow works offline; data syncs on reconnect

---

## Phase 5 — Expanded Games + Multilingual Support

**Goal:** Additional number games (PIPs medium/hard, multiples), Spelling Bee in 8 Ugandan languages, letter dictation (TTS), word spelling (STT), audio instructions in Kiswahili and Luganda.

### Tasks

- [ ] **5.1 PIPs numbers game — medium and hard difficulty**
  - Route: `/activities/pips/:difficulty`
  - Easy (Phase 1): tap the larger number
  - Medium: order 3 numbers smallest → largest within 8s
  - Hard: mental arithmetic fill-in within 10s
  - Game state managed in Zustand; score + response times posted to `/assessments/numbers/submit`
  - Verify: Hard difficulty question renders; correct answer increments score; wrong shows animated retry

- [ ] **5.2 Multiples shooting range / basket collection game**
  - Route: `/activities/multiples/:mode` (shooting | basket)
  - Targets labelled with numbers fall from top of screen; user taps correct multiples of a given number
  - Built in plain canvas (no heavy game engine); 60fps on low-end Android
  - Difficulty: easy (×2,×5,×10), medium (×3,×4,×6), hard (×7,×8,×9)
  - Verify: Game runs at stable FPS; correct taps scored; misses tracked

- [ ] **5.3 Multilingual Spelling Bee**
  - Languages: Luganda, Lusoga, Lugisu, Runyoro, Runyankole, Kiswahili, Luo, Langi
  - Word lists stored as JSON in `ilurn-api/data/spelling_bee/{lang_code}.json`
  - TTS via Web Speech API with `lang` attribute; fallback to pre-recorded MP3s if no TTS voice available for that language
  - Route pattern: `/activities/spelling-bee/:lang`
  - Verify: Kiswahili word list loads; audio fires (or MP3 fallback plays); correct answer accepted

- [ ] **5.4 Letter dictation — text to speech**
  - Route: `/activities/letter-dictation`
  - System speaks a letter; user taps the correct letter from a displayed grid
  - Uses `AudioInstructor` service with language param
  - Verify: Letter spoken; correct tap advances; 5s timer auto-advances

- [ ] **5.5 Word spelling — speech to text**
  - Route: `/activities/word-spelling`
  - System displays a word; user speaks it into microphone; Web Speech API transcribes
  - Compare transcription to target word (normalise case + punctuation)
  - Verify: Correct speech transcribed and matched; microphone permission prompt shown on first use

- [ ] **5.6 Multilingual audio instructions**
  - Extend `AudioInstructor` with Kiswahili and Luganda instruction strings
  - Admin can set preferred instruction language per student profile
  - Verify: Setting language to Luganda plays Luganda instruction on next assessment load

- [ ] **5.7 "How Are You Today?" wellbeing survey**
  - Route: `/survey/wellbeing`
  - Four sections: Health & Activities, Feelings, Getting Along with Others, About School
  - Each item has 5-point emoji scale (😊 → 😰) with accessible colour coding per PRD spec
  - Age gate: TODDLER/PRE_PRIMARY shown to parent only (parental-fill mode)
  - Results stored in `WellbeingResponse` model; surfaced in admin as engagement risk flag if score ≥ threshold
  - Verify: Survey renders all 4 sections; parental-fill mode activates for age < 6; results POST correctly

**Phase 5 Done When:**
- [ ] All number games playable at all difficulties
- [ ] Spelling Bee works in at least 3 languages with audio
- [ ] Wellbeing survey collects and stores data; admin sees risk flags

---

## Cross-Cutting Concerns (Apply in Every Phase)

### Privacy & Child Safety
- Camera consent stored per `user_id`; re-requested if revoked
- No raw video frames stored anywhere — only extracted feature vectors
- All behavioural data anonymised before any export (replace name with registration_id)
- Child data protection: no PII in logs; `parent_email` stored hashed

### Performance Budget (Low-End Devices)
- JS bundle < 200KB gzipped per route chunk (use dynamic imports)
- MediaPipe processes every 5th frame only
- SQLite WAL mode enabled for concurrent read performance
- API responses cached at service worker layer for offline use

### Font
- Century Gothic (or Futura PT as web fallback) for all assessment text displays
- Never use a variable-width font for letter/word reading screens

### Code Quality Gates (run before each phase merge)
```bash
npm run lint && npm run type-check   # frontend
pytest domains/ -v                   # backend domain unit tests
```

---

## KPIs to Track from Phase 1

| Metric | Target | Where Measured |
|---|---|---|
| Assessment completion rate | > 80% | `AssessmentResult.completed_at` not null |
| Avg session duration | 8–15 min | `Session.ended_at - started_at` |
| Classification accuracy | Validate against teacher reports | Admin feedback form (Phase 4+) |
| Offline sync success rate | > 95% | IndexedDB queue cleared count |
| Low-end device FPS (game) | ≥ 30fps | Chrome DevTools perf trace |
