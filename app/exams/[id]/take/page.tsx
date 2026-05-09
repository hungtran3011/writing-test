'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Exam, Answer } from '@/lib/types';
import { getExam, lockExam } from '@/lib/storage/examStorage';
import { createSubmission, saveSubmission, getLatestSubmission } from '@/lib/storage/submissionStorage';
import ExamTaker from '@/components/exam/ExamTaker';
import { safeGet, safeSave, safeRemove } from '@/lib/utils/indexedDB';


interface PageParams {
  params: Promise<{ id: string }>;
}

export default function TakeExamPage({ params }: PageParams) {
  const router = useRouter();
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load exam ID from params
  useEffect(() => {
    (async () => {
      try {
        const p = await params;
        setExamId(p.id);
      } catch {
        setError('Invalid exam ID');
      }
    })();
  }, [params]);

  // Load exam data
  useEffect(() => {
    if (!examId) return;

    const loadExam = async () => {
      try {
        const examData = await getExam(examId);
        if (!examData) {
          setError('Exam not found');
          setExam(null);
          setIsLoading(false);
          return;
        }

        // Check if already locked
        if (examData.status === 'completed-locked') {
          setError('This exam has already been submitted and is locked');
          setIsSubmitted(true);
          setExam(null);
          setIsLoading(false);
          return;
        }

        // Check if there's an existing submission
        const existingSubmission = await getLatestSubmission(examId);
        if (existingSubmission) {
          setError('You have already submitted this exam');
          setIsSubmitted(true);
          setExam(null);
          setIsLoading(false);
          return;
        }

        setExam(examData);
        setStartTime(Date.now());

        // Initialize answers from indexedDB if available
        const savedAnswers = await safeGet<Record<string, string>>(`exam-answers:${examId}`);
        if (savedAnswers) {
          setAnswers(savedAnswers);
        }
        setIsLoading(false);
      } catch (err) {
        setError(`Failed to load exam: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadExam();
  }, [examId]);

  // Autosave answers
  useEffect(() => {
    if (!examId || !exam) return;

    const timer = setInterval(async () => {
      try {
        await safeSave(`exam-answers:${examId}`, answers);
        console.log('Answers auto-saved');
      } catch (err) {
        console.error('Failed to autosave answers:', err);
      }
    }, 5000); // Autosave every 5 seconds

    return () => clearInterval(timer);
  }, [examId, answers, exam]);

  const handleAnswerChange = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!exam || !startTime || isSubmitted) return;

    try {
      // Create submission
      const submissionAnswers: Answer[] = exam.questions.map((q) => ({
        questionId: q.id,
        text: answers[q.id] || '',
        timeSpentSeconds: 0,
      }));

      const submission = createSubmission(exam.id, exam.collectionId, startTime, submissionAnswers);
      await saveSubmission(submission);

      // Lock the exam
      await lockExam(exam.id);

      // Clear cached answers
      await safeRemove(`exam-answers:${examId}`);

      setIsSubmitted(true);
      setExam((prev) => (prev ? { ...prev, status: 'completed-locked' } : null));

      // Redirect to result page after 2 seconds
      setTimeout(() => {
        router.push(`/exams/${exam.id}/result`);
      }, 2000);
    } catch (err) {
      setError(`Failed to submit exam: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [exam, startTime, isSubmitted, answers, examId, router]);

  const handleExamComplete = useCallback(() => {
    console.log('All sections completed - submitting');
    handleSubmit();
  }, [handleSubmit]);

  const handleCancel = useCallback(async () => {
    if (confirm('Bạn có chắc muốn hủy bài thi? Toàn bộ quá trình làm bài sẽ bị xóa.')) {
      if (examId) {
        await safeRemove(`exam-answers:${examId}`);
      }
      router.push('/');
    }
  }, [examId, router]);

  if (isLoading) {
    return <div className="w-full px-4 py-8 sm:px-6 lg:px-8">Loading exam...</div>;
  }

  if (!exam) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error || 'Exam not found'}
        </div>
        <Link href="/" className="mt-4 text-blue-600 hover:text-blue-700 inline-block">
          ← Back Home
        </Link>
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">




      {/* Submission Status */}
      {isSubmitted && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded text-green-700">
          <p className="font-bold">✓ Exam submitted successfully!</p>
          <p className="text-sm mt-1">Redirecting to results...</p>
        </div>
      )}

      {/* Error Message */}
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>}

      {/* Exam Questions */}
      <ExamTaker
        exam={exam}
        answers={answers}
        isLocked={isSubmitted}
        onAnswerChange={handleAnswerChange}
        onExamComplete={handleExamComplete}
        actionButtons={
          !isSubmitted && (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Submit Exam
              </button>
            </>
          )
        }
      />
    </main>
  );
}
