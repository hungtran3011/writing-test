import { Exam, Question } from '@/lib/types';
import { safeSave, safeGet, safeRemove } from '@/lib/utils/localStorage';

/**
 * Exam Storage - manages exams within collections
 * Enforces lock policy: locked exams cannot be edited
 */

const EXAMS_INDEX_KEY_PREFIX = 'exams';
const EXAM_KEY_PREFIX = 'exam';

export function createExam(
  collectionId: string,
  title: string,
  durationMinutes: number,
  description?: string
): Exam {
  const now = Date.now();
  return {
    id: `exam_${now}_${Math.random().toString(36).substr(2, 9)}`,
    collectionId,
    title,
    description,
    durationMinutes,
    questions: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Save a new exam to a collection
 */
export function saveExam(exam: Exam): void {
  safeSave(`${EXAM_KEY_PREFIX}:${exam.id}`, exam);

  // Update exams index for this collection
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = safeGet<Exam[]>(key, []) ?? [];
  if (!exams.find((e) => e.id === exam.id)) {
    exams.push(exam);
    safeSave(key, exams);
  }
}

/**
 * Get all exams in a collection
 */
export function getExamsByCollection(collectionId: string): Exam[] {
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${collectionId}`;
  return safeGet<Exam[]>(key, []) ?? [];
}

/**
 * Get a single exam by ID
 */
export function getExam(id: string): Exam | null {
  return safeGet<Exam>(`${EXAM_KEY_PREFIX}:${id}`, undefined);
}

/**
 * Update exam (ONLY if not locked)
 */
export function updateExam(id: string, updates: Partial<Omit<Exam, 'id' | 'collectionId' | 'createdAt'>>): void {
  const exam = getExam(id);
  if (!exam) {
    throw new Error(`Exam not found: ${id}`);
  }

  if (exam.status === 'completed-locked') {
    throw new Error(`Cannot edit locked exam: ${id}`);
  }

  const updated: Exam = {
    ...exam,
    ...updates,
    updatedAt: Date.now(),
  };

  safeSave(`${EXAM_KEY_PREFIX}:${id}`, updated);

  // Update collection's exam index
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = safeGet<Exam[]>(key, []) ?? [];
  const index = exams.findIndex((e) => e.id === id);
  if (index >= 0) {
    exams[index] = updated;
    safeSave(key, exams);
  }
}

/**
 * Add a question to an exam (ONLY if not locked)
 */
export function addQuestion(examId: string, question: Question): void {
  const exam = getExam(examId);
  if (!exam) {
    throw new Error(`Exam not found: ${examId}`);
  }

  if (exam.status === 'completed-locked') {
    throw new Error(`Cannot add question to locked exam: ${examId}`);
  }

  const updated: Exam = {
    ...exam,
    questions: [...exam.questions, question],
    updatedAt: Date.now(),
  };

  updateExam(examId, { questions: updated.questions });
}

/**
 * Update a question (ONLY if exam not locked)
 */
export function updateQuestion(examId: string, questionId: string, updates: Partial<Question>): void {
  const exam = getExam(examId);
  if (!exam) {
    throw new Error(`Exam not found: ${examId}`);
  }

  if (exam.status === 'completed-locked') {
    throw new Error(`Cannot edit questions in locked exam: ${examId}`);
  }

  const question = exam.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  const updated: Question = {
    ...question,
    ...updates,
  };

  const questions = exam.questions.map((q) => (q.id === questionId ? updated : q));
  updateExam(examId, { questions });
}

/**
 * Delete a question from exam (ONLY if exam not locked)
 */
export function deleteQuestion(examId: string, questionId: string): void {
  const exam = getExam(examId);
  if (!exam) {
    throw new Error(`Exam not found: ${examId}`);
  }

  if (exam.status === 'completed-locked') {
    throw new Error(`Cannot delete questions from locked exam: ${examId}`);
  }

  const questions = exam.questions.filter((q) => q.id !== questionId);
  if (questions.length === 0) {
    throw new Error('Cannot delete all questions. Exam must have at least one question.');
  }

  updateExam(examId, { questions });
}

/**
 * Transition exam status to 'completed-locked' when submitted
 */
export function lockExam(id: string): void {
  const exam = getExam(id);
  if (!exam) {
    throw new Error(`Exam not found: ${id}`);
  }

  const updated: Exam = {
    ...exam,
    status: 'completed-locked',
    completedAt: Date.now(),
    updatedAt: Date.now(),
  };

  safeSave(`${EXAM_KEY_PREFIX}:${id}`, updated);

  // Update collection's exam index
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = safeGet<Exam[]>(key, []) ?? [];
  const index = exams.findIndex((e) => e.id === id);
  if (index >= 0) {
    exams[index] = updated;
    safeSave(key, exams);
  }
}

/**
 * Delete an exam (ONLY if not locked)
 */
export function deleteExam(id: string): void {
  const exam = getExam(id);
  if (!exam) {
    throw new Error(`Exam not found: ${id}`);
  }

  if (exam.status === 'completed-locked') {
    throw new Error(`Cannot delete locked exam: ${id}`);
  }

  safeRemove(`${EXAM_KEY_PREFIX}:${id}`);

  // Update collection's exam index
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = (safeGet<Exam[]>(key, []) ?? []).filter((e) => e.id !== id);
  if (exams.length > 0) {
    safeSave(key, exams);
  } else {
    safeRemove(key);
  }
}
