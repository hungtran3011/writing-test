'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Exam, Submission } from '@/lib/types';
import { getExam } from '@/lib/storage/examStorage';
import { getLatestSubmission } from '@/lib/storage/submissionStorage';
import { exportExamToPDF, formatDuration } from '@/lib/pdf/examExporter';

interface PageParams {
  params: Promise<{ id: string }>;
}

export default function ExamResultPage({ params }: PageParams) {
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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

  // Load exam and submission data
  useEffect(() => {
    if (!examId) return;

    const loadData = async () => {
      try {
        const examData = getExam(examId);
        if (!examData) {
          setError('Exam not found');
          setIsLoading(false);
          return;
        }

        const submissionData = getLatestSubmission(examId);
        if (!submissionData) {
          setError('No submission found for this exam');
          setIsLoading(false);
          return;
        }

        setExam(examData);
        setSubmission(submissionData);
      } catch (err) {
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [examId]);

  const handleExportPDF = async () => {
    if (!exam || !submission) return;

    setIsExporting(true);
    try {
      await exportExamToPDF(exam, submission, `${exam.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    } catch {
      setError('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <div className="w-full px-4 py-8 sm:px-6 lg:px-8">Loading result...</div>;
  }

  if (!exam || !submission) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-4">
          {error || 'Result not found'}
        </div>
        <Link href="/" className="text-blue-600 hover:text-blue-700 inline-block">
          ← Back Home
        </Link>
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Submitted</h1>
        <p className="text-gray-600">Your exam has been successfully submitted and locked</p>
      </div>

      {/* Summary Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Exam Title</p>
            <p className="text-lg font-bold text-gray-900">{exam.title}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Submitted</p>
            <p className="text-lg font-bold text-gray-900">{new Date(submission.completedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Time Spent</p>
            <p className="text-lg font-bold text-gray-900">{formatDuration(submission.durationSeconds)}</p>
          </div>
        </div>
      </div>

      {/* Export PDF Button */}
      <div className="mb-8">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isExporting ? 'Exporting PDF...' : 'Download as PDF'}
        </button>
      </div>

      {/* Questions and Answers */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Questions and Answers</h2>

        {exam.questions.map((question, index) => {
          const answer = submission.answers.find((a) => a.questionId === question.id);
          return (
            <div key={question.id} className="bg-white p-6 rounded-lg border border-gray-200">
              {/* Question Header */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Question {index + 1}</h3>
                <p className="text-gray-700 mt-2">{question.text}</p>
              </div>

              {/* Question Image */}
              {question.image && (
                <div className="mb-4">
                  <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={question.image} alt="Question" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {/* Answer */}
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-2">Your Answer:</p>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {answer?.text || '(No answer provided)'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Export Button */}
      <div className="mt-12 flex justify-center">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isExporting ? 'Exporting PDF...' : 'Download Full Exam as PDF'}
        </button>
      </div>
    </main>
  );
}
