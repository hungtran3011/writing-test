'use client';

import { useEffect, useMemo, useState } from 'react';
import { Exam, Question } from '@/lib/types';

interface ExamTakerProps {
  exam: Exam;
  answers: Record<string, string>; // questionId -> answer text
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}

export default function ExamTaker({ exam, answers, isLocked, onAnswerChange }: ExamTakerProps) {
  // Group questions by section (using sectionLabel or position)
  const sections = useMemo(() => {
    const map = new Map<string, Question[]>();
    exam.questions.forEach((q) => {
      const label = q.sectionLabel || `Q${q.position || q.order + 1}`;
      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(q);
    });
    return Array.from(map.entries()).map(([label, questions]) => ({
      label,
      questions,
      timeLimitSeconds: questions[0]?.timeLimitSeconds,
    }));
  }, [exam.questions]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {sections.map((section) => (
        <ExamSection
          key={section.label}
          section={section}
          answers={answers}
          isLocked={isLocked}
          onAnswerChange={onAnswerChange}
        />
      ))}
    </div>
  );
}

interface SectionDef {
  label: string;
  questions: Question[];
  timeLimitSeconds?: number;
}

function ExamSection({
  section,
  answers,
  isLocked,
  onAnswerChange,
}: {
  section: SectionDef;
  answers: Record<string, string>;
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}) {
  const { label, questions, timeLimitSeconds } = section;
  const [remaining, setRemaining] = useState<number | null>(timeLimitSeconds ?? null);

  // Section-level timer
  useEffect(() => {
    if (!timeLimitSeconds) return;
    setRemaining(timeLimitSeconds);
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r === null) return null;
        if (r <= 1) {
          clearInterval(timer);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLimitSeconds]);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
        {timeLimitSeconds != null && (
          <div className={`text-lg font-semibold px-4 py-2 rounded ${remaining !== null && remaining < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            ⏱ {formatTime(remaining)}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, idx) => (
          <QuestionRenderer
            key={question.id}
            question={question}
            sectionIndex={idx}
            sectionTotal={questions.length}
            answer={answers[question.id] || ''}
            isLocked={isLocked}
            onAnswerChange={onAnswerChange}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionRenderer({
  question,
  sectionIndex,
  sectionTotal,
  answer,
  isLocked,
  onAnswerChange,
}: {
  question: Question;
  sectionIndex: number;
  sectionTotal: number;
  answer: string;
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}) {
  if (question.type === 'image-description') {
    return (
      <ImageDescriptionQuestion
        question={question}
        sectionIndex={sectionIndex}
        sectionTotal={sectionTotal}
        answer={answer}
        isLocked={isLocked}
        onAnswerChange={onAnswerChange}
      />
    );
  }

  if (question.type === 'email-reply') {
    return (
      <EmailReplyQuestion
        question={question}
        sectionIndex={sectionIndex}
        sectionTotal={sectionTotal}
        answer={answer}
        isLocked={isLocked}
        onAnswerChange={onAnswerChange}
      />
    );
  }

  if (question.type === 'essay') {
    return (
      <EssayQuestion
        question={question}
        sectionIndex={sectionIndex}
        sectionTotal={sectionTotal}
        answer={answer}
        isLocked={isLocked}
        onAnswerChange={onAnswerChange}
      />
    );
  }

  // Default: text-essay
  return (
    <TextEssayQuestion
      question={question}
      sectionIndex={sectionIndex}
      sectionTotal={sectionTotal}
      answer={answer}
      isLocked={isLocked}
      onAnswerChange={onAnswerChange}
    />
  );
}

function TextEssayQuestion({
  question,
  sectionIndex,
  sectionTotal,
  answer,
  isLocked,
  onAnswerChange,
}: {
  question: Question;
  sectionIndex: number;
  sectionTotal: number;
  answer: string;
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      {/* Question Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <p className="text-gray-700 mt-2 whitespace-pre-wrap">{question.text}</p>
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

      {/* Answer Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Exam submitted - cannot edit' : 'Type your answer here...'}
          className={`w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-1">{answer?.length || 0} characters</p>
      </div>
    </div>
  );
}

function ImageDescriptionQuestion({
  question,
  sectionIndex,
  sectionTotal,
  answer,
  isLocked,
  onAnswerChange,
}: {
  question: Question;
  sectionIndex: number;
  sectionTotal: number;
  answer: string;
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}) {
  const images = question.images || [];
  const required = question.requiredWords || [];
  const [pos, setPos] = useState(0);
  const total = images.length;

  const missingWords = useMemo(() => {
    const text = (answer || '').toLowerCase();
    return (required[pos] || []).filter((w) => w && !text.includes(w.toLowerCase()));
  }, [answer, pos, required]);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <p className="text-gray-700 mt-2">{question.text}</p>
      </div>

      {total > 0 && (
        <div className="mb-4">
          <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[pos]} alt={`img-${pos}`} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <button onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos === 0} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">
                ← Prev
              </button>
              <button onClick={() => setPos((p) => Math.min(total - 1, p + 1))} disabled={pos === total - 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">
                Next →
              </button>
              <span className="text-sm text-gray-600 ml-2">Image {pos + 1} of {total}</span>
            </div>
          </div>

          <div className="mt-3 text-sm p-3 bg-purple-50 rounded border border-purple-200">
            <strong className="text-purple-900">Required words for Image {pos + 1}:</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {(required[pos] || []).map((w, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded font-medium ${
                    w && !missingWords.includes(w) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {w || '(not set)'}
                </span>
              ))}
            </div>
            {missingWords.length > 0 && (
              <p className="text-xs text-red-600 mt-2 font-semibold">
                ❌ Missing: {missingWords.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Description</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Exam submitted - cannot edit' : 'Describe the images here...'}
          className={`w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-1">{answer?.length || 0} characters</p>
      </div>
    </div>
  );
}

function EmailReplyQuestion({
  question,
  sectionIndex,
  sectionTotal,
  answer,
  isLocked,
  onAnswerChange,
}: {
  question: Question;
  sectionIndex: number;
  sectionTotal: number;
  answer: string;
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <div className="mt-3 p-4 bg-gray-50 rounded-md border border-gray-300">
          <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{question.text}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Email Reply</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Exam submitted - cannot edit' : 'Type your email reply here...'}
          className={`w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
          rows={8}
        />
        <p className="text-xs text-gray-500 mt-1">{answer?.length || 0} characters</p>
      </div>
    </div>
  );
}

function EssayQuestion({
  question,
  sectionIndex,
  sectionTotal,
  answer,
  isLocked,
  onAnswerChange,
}: {
  question: Question;
  sectionIndex: number;
  sectionTotal: number;
  answer: string;
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <p className="text-gray-700 mt-2 whitespace-pre-wrap">{question.text}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Essay</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Exam submitted - cannot edit' : 'Write your essay here...'}
          className={`w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
          rows={10}
        />
        <div className="mt-1 flex justify-between items-center">
          <p className="text-xs text-gray-500">{answer?.length || 0} characters</p>
          <p className="text-xs text-gray-500">{answer?.split(/\s+/).filter(Boolean).length || 0} words</p>
        </div>
      </div>
    </div>
  );
}
