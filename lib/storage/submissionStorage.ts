import { Submission, Answer } from '@/lib/types';
import { safeSave, safeGet } from '@/lib/utils/indexedDB';

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
export async function saveSubmission(submission: Submission): Promise<void> {
  await safeSave(`${SUBMISSION_KEY_PREFIX}:${submission.id}`, submission);

  // Update submissions index
  const index = (await safeGet<Record<string, string[]>>(SUBMISSIONS_INDEX_KEY, {})) ?? {};
  if (!index[submission.examId]) {
    index[submission.examId] = [];
  }
  if (!index[submission.examId].find((s: string) => s === submission.id)) {
    index[submission.examId].push(submission.id);
  }
  await safeSave(SUBMISSIONS_INDEX_KEY, index);
}

/**
 * Get all submissions for an exam
 */
export async function getSubmissionsByExam(examId: string): Promise<Submission[]> {
  const index = (await safeGet<Record<string, string[]>>(SUBMISSIONS_INDEX_KEY, {})) ?? {};
  const submissionIds = index[examId] ?? [];
  const submissions = await Promise.all(
    submissionIds.map((id: string) => safeGet<Submission>(`${SUBMISSION_KEY_PREFIX}:${id}`, undefined))
  );
  return submissions.filter((s: Submission | null | undefined): s is Submission => s !== null && s !== undefined);
}

/**
 * Get a single submission by ID
 */
export async function getSubmission(id: string): Promise<Submission | null> {
  return await safeGet<Submission>(`${SUBMISSION_KEY_PREFIX}:${id}`, undefined);
}

/**
 * Get the most recent submission for an exam
 */
export async function getLatestSubmission(examId: string): Promise<Submission | null> {
  const submissions = await getSubmissionsByExam(examId);
  if (submissions.length === 0) return null;
  return submissions.sort((a, b) => b.completedAt - a.completedAt)[0];
}

/**
 * Get all submissions for a collection
 */
export async function getSubmissionsByCollection(collectionId: string): Promise<Submission[]> {
  const index = (await safeGet<Record<string, string[]>>(SUBMISSIONS_INDEX_KEY, {})) ?? {};
  const allSubmissionIds = Object.values(index).flat() as string[];
  const submissions = await Promise.all(
    allSubmissionIds.map((id: string) => safeGet<Submission>(`${SUBMISSION_KEY_PREFIX}:${id}`, undefined))
  );
  return submissions
    .filter((s: Submission | null | undefined): s is Submission => s !== null && s !== undefined)
    .filter((s) => s.collectionId === collectionId);
}

/**
 * Check if exam has any submissions (used to determine if can be edited)
 */
export async function hasSubmissions(examId: string): Promise<boolean> {
  const submissions = await getSubmissionsByExam(examId);
  return submissions.length > 0;
}
