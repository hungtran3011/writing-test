'use client';

import { Question } from '@/lib/types';

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
}

export default function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500">No questions yet. Add your first question to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div key={question.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Question {index + 1}</span>
                {question.image && <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Has Image</span>}
              </div>
              <p className="text-gray-600 mt-2 line-clamp-2">{question.text}</p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onEdit(question)}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(question.id)}
                className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
