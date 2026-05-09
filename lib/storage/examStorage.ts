import { Exam, Question } from '@/lib/types';
import { safeSave, safeGet, safeRemove } from '@/lib/utils/indexedDB';

/**
 * Exam Storage - manages exams within collections
 * Fixed structure: All exams have exactly 8 questions with predefined types and timings
 * Q1-5: image-description (8 minutes total)
 * Q6-7: email-reply (10 minutes each, 20 minutes total)
 * Q8: essay (30 minutes)
 * Enforces lock policy: locked exams cannot be edited
 */

const EXAMS_INDEX_KEY_PREFIX = 'exams';
const EXAM_KEY_PREFIX = 'exam';

// Fixed exam structure configuration
export const FIXED_EXAM_STRUCTURE: Array<{
  position: number;
  type: 'image-description' | 'email-reply' | 'essay';
  sectionLabel: string;
  timeLimitSeconds: number;
  defaultText: string;
}> = [
  {
    position: 1,
    type: 'image-description',
    sectionLabel: 'Q1-5: Image Description',
    timeLimitSeconds: 480, // 8 minutes for all 5
    defaultText: 'Describe the image using the required words.',
  },
  {
    position: 2,
    type: 'image-description',
    sectionLabel: 'Q1-5: Image Description',
    timeLimitSeconds: 480,
    defaultText: 'Describe the image using the required words.',
  },
  {
    position: 3,
    type: 'image-description',
    sectionLabel: 'Q1-5: Image Description',
    timeLimitSeconds: 480,
    defaultText: 'Describe the image using the required words.',
  },
  {
    position: 4,
    type: 'image-description',
    sectionLabel: 'Q1-5: Image Description',
    timeLimitSeconds: 480,
    defaultText: 'Describe the image using the required words.',
  },
  {
    position: 5,
    type: 'image-description',
    sectionLabel: 'Q1-5: Image Description',
    timeLimitSeconds: 480,
    defaultText: 'Describe the image using the required words.',
  },
  {
    position: 6,
    type: 'email-reply',
    sectionLabel: 'Q6: Email 1',
    timeLimitSeconds: 600, // 10 minutes
    defaultText: 'Reply to the email',
  },
  {
    position: 7,
    type: 'email-reply',
    sectionLabel: 'Q7: Email 2',
    timeLimitSeconds: 600, // 10 minutes
    defaultText: 'Reply to the email',
  },
  {
    position: 8,
    type: 'essay',
    sectionLabel: 'Q8: Essay',
    timeLimitSeconds: 1800, // 30 minutes
    defaultText: 'Write an essay on the given topic.',
  },
];

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
 * Initialize a new exam with the fixed 8-question structure
 */
export function initializeFixedExam(
  collectionId: string,
  title: string,
  description?: string
): Exam {
  const exam = createExam(collectionId, title, 68, description); // 8+20+30 = 58 minutes, rounded to 68
  
  // Create 8 pre-populated questions based on fixed structure
  exam.questions = FIXED_EXAM_STRUCTURE.map((config) => {
    const question: Question = {
      id: `q_${exam.id}_${config.position}`,
      type: config.type,
      text: config.defaultText,
      position: config.position,
      sectionLabel: config.sectionLabel,
      timeLimitSeconds: config.timeLimitSeconds,
      order: config.position,
    };
    
    // Initialize type-specific fields
    if (config.type === 'image-description') {
      question.images = [];
      question.requiredWords = [];
    }
    
    return question;
  });
  
  return exam;
}

/**
 * Validate that exam has the correct fixed structure (8 questions with correct types)
 */
function validateFixedStructure(exam: Exam): void {
  if (exam.questions.length !== 8) {
    throw new Error(`Exam must have exactly 8 questions, found ${exam.questions.length}`);
  }
  
  for (let i = 0; i < 8; i++) {
    const expected = FIXED_EXAM_STRUCTURE[i];
    const actual = exam.questions[i];
    
    if (actual.type !== expected.type) {
      throw new Error(
        `Question at position ${i + 1} must be type '${expected.type}', found '${actual.type}'`
      );
    }
  }
}

/**
 * Save a new exam to a collection
 */
export async function saveExam(exam: Exam): Promise<void> {
  // Validate fixed structure
  validateFixedStructure(exam);
  
  await safeSave(`${EXAM_KEY_PREFIX}:${exam.id}`, exam);

  // Update exams index for this collection
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = (await safeGet<Exam[]>(key, [])) ?? [];
  if (!exams.find((e) => e.id === exam.id)) {
    exams.push(exam);
    await safeSave(key, exams);
  }
}

/**
 * Get all exams in a collection
 */
export async function getExamsByCollection(collectionId: string): Promise<Exam[]> {
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${collectionId}`;
  return (await safeGet<Exam[]>(key, [])) ?? [];
}

/**
 * Get a single exam by ID
 */
export async function getExam(id: string): Promise<Exam | null> {
  const exam = await safeGet<Exam>(`${EXAM_KEY_PREFIX}:${id}`, undefined);
  if (exam) {
    // Validate structure on load
    try {
      validateFixedStructure(exam);
    } catch (e) {
      console.error('Exam structure validation failed:', e);
      // Return exam anyway, but log the error
    }
  }
  return exam ?? null;
}

/**
 * Update exam (ONLY if not locked)
 */
export async function updateExam(id: string, updates: Partial<Omit<Exam, 'id' | 'collectionId' | 'createdAt'>>): Promise<void> {
  const exam = await getExam(id);
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

  await safeSave(`${EXAM_KEY_PREFIX}:${id}`, updated);

  // Update collection's exam index
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = (await safeGet<Exam[]>(key, [])) ?? [];
  const index = exams.findIndex((e) => e.id === id);
  if (index >= 0) {
    exams[index] = updated;
    await safeSave(key, exams);
  }
}

/**
 * Add a question to an exam (DISABLED - Fixed structure only allows content updates)
 */
export function addQuestion(_examId: string, _question: Question): void {
  throw new Error(
    'Cannot add questions to exams with fixed structure. Use updateQuestion to modify existing questions.'
  );
}

/**
 * Update a question (ONLY if exam not locked)
 */
export async function updateQuestion(examId: string, questionId: string, updates: Partial<Question>): Promise<void> {
  const exam = await getExam(examId);
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
  await updateExam(examId, { questions });
}

/**
 * Delete a question from exam (DISABLED - Fixed structure preserves all questions)
 */
export function deleteQuestion(_examId: string, _questionId: string): void {
  throw new Error(
    'Cannot delete questions from exams with fixed structure. All 8 questions must be preserved.'
  );
}

/**
 * Transition exam status to 'completed-locked' when submitted
 */
export async function lockExam(id: string): Promise<void> {
  const exam = await getExam(id);
  if (!exam) {
    throw new Error(`Exam not found: ${id}`);
  }

  const updated: Exam = {
    ...exam,
    status: 'completed-locked',
    completedAt: Date.now(),
    updatedAt: Date.now(),
  };

  await safeSave(`${EXAM_KEY_PREFIX}:${id}`, updated);

  // Update collection's exam index
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = (await safeGet<Exam[]>(key, [])) ?? [];
  const index = exams.findIndex((e) => e.id === id);
  if (index >= 0) {
    exams[index] = updated;
    await safeSave(key, exams);
  }
}

/**
 * Delete an exam (ONLY if not locked)
 */
export async function deleteExam(id: string): Promise<void> {
  const exam = await getExam(id);
  if (!exam) {
    throw new Error(`Exam not found: ${id}`);
  }

  if (exam.status === 'completed-locked') {
    throw new Error(`Cannot delete locked exam: ${id}`);
  }

  await safeRemove(`${EXAM_KEY_PREFIX}:${id}`);

  // Update collection's exam index
  const key = `${EXAMS_INDEX_KEY_PREFIX}:${exam.collectionId}`;
  const exams = ((await safeGet<Exam[]>(key, [])) ?? []).filter((e) => e.id !== id);
  if (exams.length > 0) {
    await safeSave(key, exams);
  } else {
    await safeRemove(key);
  }
}
