import { Submission, Answer } from '@/lib/types';
import { safeSave, safeGet } from '@/lib/utils/localStorage';

/**
 * Submission Storage - manages exam submissions (locked once saved)
 */

const SUBMISSIONS_INDEX_KEY = 'submissions';
const SUBMISSION_KEY_PREFIX = 'submission';

export function createSubmission(
  examId: string,
  collectionId: string,
  startedAt: number,
  answers: Answer[]
): Submission {
  const now = Date.now();
  return {
    id: `sub_${now}_${Math.random().toString(36).substr(2, 9)}`,
    examId,
    collectionId,
    answers,
    startedAt,
    completedAt: now,
    durationSeconds: Math.floor((now - startedAt) / 1000),
    status: 'completed',
  };
}

/**
 * Save a submission (immutable - once saved, cannot be changed)
 */
export function saveSubmission(submission: Submission): void {
  safeSave(`${SUBMISSION_KEY_PREFIX}:${submission.id}`, submission);

  // Update submissions index
  const index = safeGet<Record<string, string[]>>(SUBMISSIONS_INDEX_KEY, {}) ?? {};
  if (!index[submission.examId]) {
    index[submission.examId] = [];
  }
  if (!index[submission.examId].find((s: string) => s === submission.id)) {
    index[submission.examId].push(submission.id);
  }
  safeSave(SUBMISSIONS_INDEX_KEY, index);
}

/**
 * Get all submissions for an exam
 */
export function getSubmissionsByExam(examId: string): Submission[] {
  const index = safeGet<Record<string, string[]>>(SUBMISSIONS_INDEX_KEY, {}) ?? {};
  const submissionIds = index[examId] ?? [];
  return submissionIds
    .map((id: string) => safeGet<Submission>(`${SUBMISSION_KEY_PREFIX}:${id}`, undefined))
    .filter((s: Submission | null | undefined): s is Submission => s !== null && s !== undefined);
}

/**
 * Get a single submission by ID
 */
export function getSubmission(id: string): Submission | null {
  return safeGet<Submission>(`${SUBMISSION_KEY_PREFIX}:${id}`, undefined);
}

/**
 * Get the most recent submission for an exam
 */
export function getLatestSubmission(examId: string): Submission | null {
  const submissions = getSubmissionsByExam(examId);
  if (submissions.length === 0) return null;
  return submissions.sort((a, b) => b.completedAt - a.completedAt)[0];
}

/**
 * Get all submissions for a collection
 */
export function getSubmissionsByCollection(collectionId: string): Submission[] {
  const index = safeGet<Record<string, string[]>>(SUBMISSIONS_INDEX_KEY, {}) ?? {};
  const allSubmissionIds = Object.values(index).flat() as string[];
  return allSubmissionIds
    .map((id: string) => safeGet<Submission>(`${SUBMISSION_KEY_PREFIX}:${id}`, undefined))
    .filter((s: Submission | null | undefined): s is Submission => s !== null && s !== undefined)
    .filter((s) => s.collectionId === collectionId);
}

/**
 * Check if exam has any submissions (used to determine if can be edited)
 */
export function hasSubmissions(examId: string): boolean {
  const submissions = getSubmissionsByExam(examId);
  return submissions.length > 0;
}
