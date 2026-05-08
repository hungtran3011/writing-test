'use client';

import { Exam } from '@/lib/types';

interface ExamTakerProps {
  exam: Exam;
  answers: Record<string, string>; // questionId -> answer text
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
}

export default function ExamTaker({ exam, answers, isLocked, onAnswerChange }: ExamTakerProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {exam.questions.map((question, index) => (
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

          {/* Answer Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
            <textarea
              value={answers[question.id] || ''}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
              disabled={isLocked}
              placeholder={isLocked ? 'Exam submitted - cannot edit' : 'Type your answer here...'}
              className={`w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
              }`}
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              {answers[question.id]?.length || 0} characters
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
