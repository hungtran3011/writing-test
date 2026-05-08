'use client';

import { JSX, useState } from 'react';
import { Exam, Question } from '@/lib/types';
import { updateExam } from '@/lib/storage/examStorage';
import QuestionForm from './QuestionForm';

interface ExamFormProps {
  collectionId: string;
  initialExam?: Exam;
  onSave: (exam: Exam) => void;
  onCancel: () => void;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

const createEmptyExam = (collectionId: string): Exam => {
  const now = Date.now();

  return {
    id: generateId(),
    collectionId,
    title: '',
    description: '',
    durationMinutes: 60,
    questions: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
};

export default function ExamForm({ collectionId, initialExam, onSave, onCancel }: ExamFormProps) {
  const [exam, setExam] = useState<Exam>(() => initialExam || createEmptyExam(collectionId));
  const [editingSlots, setEditingSlots] = useState<Record<number, Question | undefined>>({});
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExam({ ...exam, title: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExam({ ...exam, description: e.target.value });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseInt(e.target.value, 10);
    if (!isNaN(duration) && duration > 0) {
      setExam({ ...exam, durationMinutes: duration });
    }
  };

  const handleSaveQuestion = (index: number, savedQuestion: Question) => {
    setError(null);

    if (!Object.prototype.hasOwnProperty.call(editingSlots, index)) {
      return;
    }

    const slotValue = editingSlots[index];

    if (slotValue !== undefined) {
      // Update existing question at index
      const updated = [...exam.questions];
      updated[index] = { ...savedQuestion, order: index };
      setExam({ ...exam, questions: updated });

      // close this editing slot
      setEditingSlots((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
    } else {
      // Insert new question at index
      const updated = [...exam.questions];
      updated.splice(index, 0, { ...savedQuestion, order: index });
      const reordered = updated.map((q, i) => ({ ...q, order: i }));
      setExam({ ...exam, questions: reordered });

      // shift editing slots at/after index and remove the saved slot
      setEditingSlots((prev) => {
        const newSlots: Record<number, Question | undefined> = {};
        Object.keys(prev)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach((k) => {
            if (k < index) newSlots[k] = prev[k];
            else if (k === index) {
              // skip saved slot
            } else {
              newSlots[k + 1] = prev[k];
            }
          });
        return newSlots;
      });
    }
  };

  const openEdit = (index: number) => {
    setEditingSlots((prev) => ({ ...prev, [index]: exam.questions[index] }));
  };

  const openInsertAt = (index: number) => {
    setEditingSlots((prev) => {
      let idx = index;
      while (Object.prototype.hasOwnProperty.call(prev, idx)) {
        idx += 1;
      }
      return { ...prev, [idx]: undefined };
    });
  };

  const closeEdit = (index: number) => {
    setEditingSlots((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    const deletedIndex = exam.questions.findIndex((q) => q.id === questionId);
    const updated = exam.questions.filter((q) => q.id !== questionId).map((q, i) => ({ ...q, order: i }));
    setExam({ ...exam, questions: updated });

    if (deletedIndex >= 0) {
      setEditingSlots((prev) => {
        const newSlots: Record<number, Question | undefined> = {};
        Object.keys(prev)
          .map(Number)
          .sort((a, b) => a - b)
          .forEach((k) => {
            if (k < deletedIndex) newSlots[k] = prev[k];
            else if (k === deletedIndex) {
              // drop slot for deleted question
            } else newSlots[k - 1] = prev[k];
          });
        return newSlots;
      });
    }
  };

  const handleSave = () => {
    setError(null);

    // Validation
    if (!exam.title.trim()) {
      setError('Exam title is required');
      return;
    }

    if (exam.questions.length === 0) {
      setError('Exam must have at least one question');
      return;
    }

    if (exam.durationMinutes < 1) {
      setError('Duration must be at least 1 minute');
      return;
    }

    try {
      if (initialExam) {
        updateExam(exam.id, {
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          questions: exam.questions,
        });
      } else {
        // For new exam, still need to use storage
        setExam({ ...exam, status: 'ready' });
      }

      onSave({ ...exam, status: 'ready' });
    } catch (err) {
      setError(`Failed to save exam: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Basic Info */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{initialExam ? 'Edit Exam' : 'Create New Exam'}</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Exam Title *</label>
          <input
            type="text"
            value={exam.title}
            onChange={handleTitleChange}
            placeholder="e.g., English Final Exam"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={exam.description || ''}
            onChange={handleDescriptionChange}
            placeholder="Optional exam description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
          <input
            type="number"
            value={exam.durationMinutes}
            onChange={handleDurationChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Questions ({exam.questions.length})</h3>
          <button
            onClick={() => openInsertAt(exam.questions.length)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + Add Question
          </button>
        </div>

        <div className="space-y-2">
          {
            (() => {
              const items: JSX.Element[] = [];
              for (let i = 0; i <= exam.questions.length; i++) {
                // insertion slot (standalone form)
                if (Object.prototype.hasOwnProperty.call(editingSlots, i) && editingSlots[i] === undefined) {
                  items.push(
                    <div key={`insert-${i}`} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Question {i + 1}</span>
                        <div />
                      </div>
                      <div className="mt-3">
                        <QuestionForm
                          question={undefined}
                          onSave={(q) => handleSaveQuestion(i, q)}
                          onCancel={() => closeEdit(i)}
                        />
                      </div>
                    </div>
                  );
                }

                if (i < exam.questions.length) {
                  const question = exam.questions[i];
                  const isEditingExisting = Object.prototype.hasOwnProperty.call(editingSlots, i) && editingSlots[i] !== undefined;

                  items.push(
                    <div key={question.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Question {i + 1}</span>
                            {question.image && <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Has Image</span>}
                          </div>
                          <p className="text-gray-600 mt-2 line-clamp-2">{question.text}</p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => openEdit(i)}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => openInsertAt(i + 1)}
                            className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100"
                          >
                            Insert
                          </button>
                        </div>
                      </div>

                      {isEditingExisting && (
                        <div className="mt-4">
                          <QuestionForm
                            question={editingSlots[i]}
                            onSave={(q) => handleSaveQuestion(i, q)}
                            onCancel={() => closeEdit(i)}
                          />
                        </div>
                      )}
                    </div>
                  );
                }
              }
              return items;
            })()
          }
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {initialExam ? 'Update Exam' : 'Create Exam'}
        </button>
      </div>
    </div>
  );
}
