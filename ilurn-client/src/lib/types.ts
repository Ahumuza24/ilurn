export interface QuestionResponse {
  question_id: string;
  response: string;
  is_correct: boolean;
  response_time_ms: number;
}

export interface ProgressInfo {
  assessment_type: string;
  completed_at: string;
  score_band: string;
}

export interface Student {
  id: number;
  name: string;
  age_group: string;
  registration_id: string;
  last_assessment_date: string | null;
  last_score: number | null;
  score_band: string;
}

export type AssessmentType = 'word-reading' | 'spelling' | 'spelling-bee';
export type AssessmentItemType = 'letter' | 'word';

export interface AssessmentItem {
  id: number;
  assessment_type: AssessmentType;
  item_type: AssessmentItemType;
  text: string;
  sentence: string | null;
  difficulty: string;
  sort_order: number;
  active: boolean;
}

export interface StudentResult {
  id: number;
  assessment_type: string;
  raw_score: number;
  letter_score: number;
  word_score: number;
  score_band: string;
  completed_at: string;
}

export interface StudentDetail {
  id: number;
  name: string;
  age_group: string;
  registration_id: string;
  created_at: string;
  results: StudentResult[];
}

export interface AnalyticsByType {
  assessment_type: string;
  count: number;
  average_score: number;
}

export interface AnalyticsRecent {
  name: string;
  assessment_type: string;
  raw_score: number;
  score_band: string;
  completed_at: string;
}

export interface Analytics {
  total_learners: number;
  total_assessments: number;
  assessed_learners: number;
  score_bands: Record<string, number>;
  by_assessment_type: AnalyticsByType[];
  age_groups: { age_group: string; count: number }[];
  recent: AnalyticsRecent[];
}
