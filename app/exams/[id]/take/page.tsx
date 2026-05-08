'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Exam, Answer } from '@/lib/types';
import { getExam, lockExam } from '@/lib/storage/examStorage';
import { createSubmission, saveSubmission, getLatestSubmission } from '@/lib/storage/submissionStorage';
import ExamTaker from '@/components/exam/ExamTaker';
import ExamTimer from '@/components/shared/ExamTimer';

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
        const examData = getExam(examId);
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
        const existingSubmission = getLatestSubmission(examId);
        if (existingSubmission) {
          setError('You have already submitted this exam');
          setIsSubmitted(true);
          setExam(null);
          setIsLoading(false);
          return;
        }

        setExam(examData);
        setStartTime(Date.now());

        // Initialize answers from localStorage if available
        const savedAnswers = localStorage.getItem(`exam-answers:${examId}`);
        if (savedAnswers) {
          try {
            setAnswers(JSON.parse(savedAnswers));
          } catch {
            // Ignore parse errors
          }
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

    const timer = setInterval(() => {
      try {
        localStorage.setItem(`exam-answers:${examId}`, JSON.stringify(answers));
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

  const handleSubmit = useCallback(() => {
    if (!exam || !startTime || isSubmitted) return;

    try {
      // Create submission
      const submissionAnswers: Answer[] = exam.questions.map((q) => ({
        questionId: q.id,
        text: answers[q.id] || '',
        timeSpentSeconds: 0,
      }));

      const submission = createSubmission(exam.id, exam.collectionId, startTime, submissionAnswers);
      saveSubmission(submission);

      // Lock the exam
      lockExam(exam.id);

      // Clear cached answers
      localStorage.removeItem(`exam-answers:${examId}`);

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

  const handleTimeUp = useCallback(() => {
    console.log('Time is up - auto-submitting');
    handleSubmit();
  }, [handleSubmit]);

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
        {exam.description && <p className="text-gray-600">{exam.description}</p>}
      </div>

      {/* Timer */}
      {!isSubmitted && startTime && (
        <div className="mb-8">
          <ExamTimer durationMinutes={exam.durationMinutes} onTimeUp={handleTimeUp} isSubmitted={isSubmitted} />
        </div>
      )}

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
      <ExamTaker exam={exam} answers={answers} isLocked={isSubmitted} onAnswerChange={handleAnswerChange} />

      {/* Submit Button */}
      {!isSubmitted && (
        <div className="mt-8 flex gap-4 justify-end sticky bottom-4">
          <Link href="/">
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </Link>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Submit Exam
          </button>
        </div>
      )}
    </main>
  );
}
