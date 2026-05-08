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
export type QuestionType = 'text-essay' | 'image-description' | 'email-reply' | 'essay';
// 'text-essay' = text with single optional image
// 'image-description' = single image with 2 required words (Q1-5)
// 'email-reply' = email reply prompt (Q6-7)
// 'essay' = essay writing prompt (Q8)

export interface Question {
  id: string;
  type: QuestionType;
  text: string; // Question text/prompt
  position?: number; // Fixed position in exam (1-8 for standard exams)
  sectionLabel?: string; // e.g., "Q1-5: Image Description", "Q6: Email 1"
  // Single-image legacy field (kept for backward compatibility)
  image?: string; // Base64 encoded image or URL (for text-essay, image-description)
  // New fields for image-description type
  images?: string[]; // array of base64 encoded images (for image-description)
  requiredWords?: string[][]; // requiredWords[i] = array of required words for images[i]
  timeLimitSeconds?: number; // Section-level time limit in seconds (480=8min, 600=10min, 1800=30min)
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
