/**
 * Answer - A student's answer to one question
 */
export interface Answer {
  questionId: string;
  text: string; // Long essay answer text
  timeSpentSeconds: number; // Time spent on this question
}

/**
 * Submission - A student's complete exam submission
 */
export interface Submission {
  id: string;
  examId: string;
  collectionId: string;
  answers: Answer[]; // Indexed by questionId
  startedAt: number;
  completedAt: number;
  durationSeconds: number; // Total time taken
  status: 'completed'; // Always completed when stored
}
