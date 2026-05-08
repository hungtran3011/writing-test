/**
 * Collection - Contains multiple exams
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Question - Individual question in an exam
 */
export type QuestionType = 'text-essay'; // Extendable for future types like mcq, image-text

export interface Question {
  id: string;
  type: QuestionType;
  text: string; // Question text/prompt
  image?: string; // Base64 encoded image or URL
  order: number; // For ordering questions
}

/**
 * Exam - An exam belongs to a collection
 */
export type ExamStatus = 'draft' | 'ready' | 'completed-locked';

export interface Exam {
  id: string;
  collectionId: string;
  title: string;
  description?: string;
  durationMinutes: number; // Duration for this specific exam
  questions: Question[];
  status: ExamStatus; // Tracks if exam is locked
  createdAt: number;
  updatedAt: number;
  completedAt?: number; // When exam was submitted/locked
}
