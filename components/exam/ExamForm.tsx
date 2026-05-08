'use client';

import { useState } from 'react';
import { Exam, Question } from '@/lib/types';
import { initializeFixedExam, updateExam, FIXED_EXAM_STRUCTURE } from '@/lib/storage/examStorage';
import QuestionForm from './QuestionForm';

interface ExamFormProps {
  collectionId: string;
  initialExam?: Exam;
  onSave: (exam: Exam) => void;
  onCancel: () => void;
}

export default function ExamForm({ collectionId, initialExam, onSave, onCancel }: ExamFormProps) {
  const [exam, setExam] = useState<Exam>(() => {
    if (initialExam) {
      return initialExam;
    }
    // For new exams, initialize with fixed 8-question structure
    return initializeFixedExam(collectionId, '', '');
  });

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExam({ ...exam, title: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExam({ ...exam, description: e.target.value });
  };

  const handleSaveQuestion = (questionId: string, updatedQuestion: Question) => {
    const updatedQuestions = exam.questions.map((q) => (q.id === questionId ? updatedQuestion : q));
    setExam({ ...exam, questions: updatedQuestions });
    setEditingQuestionId(null);
  };

  const handleSave = () => {
    setError(null);

    // Validation
    if (!exam.title.trim()) {
      setError('Exam title is required');
      return;
    }

    // Validate fixed structure
    if (exam.questions.length !== 8) {
      setError('Exam must have exactly 8 questions (fixed structure)');
      return;
    }

    // Validate that each question has required content
    let validationError = false;
    for (let i = 0; i < 8; i++) {
      const question = exam.questions[i];
      if (!question.text.trim()) {
        setError(`Question ${i + 1} must have text/prompt`);
        validationError = true;
        break;
      }

      // Q1-5: Must have at least one image with required words
      if (question.type === 'image-description') {
        if (!question.images || question.images.length === 0) {
          setError(`Question ${i + 1} must have at least one image`);
          validationError = true;
          break;
        }
        if (!question.requiredWords || question.requiredWords.length === 0) {
          setError(`Question ${i + 1} must have required words defined`);
          validationError = true;
          break;
        }
        // Check that each image has required words
        for (let j = 0; j < question.images.length; j++) {
          if (!question.requiredWords[j] || question.requiredWords[j].length === 0) {
            setError(`Question ${i + 1}, Image ${j + 1} must have required words`);
            validationError = true;
            break;
          }
        }
      }
    }

    if (validationError) {
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
      }

      onSave({ ...exam, status: 'ready' });
    } catch (err) {
      setError(`Failed to save exam: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getQuestionBadge = (question: Question): string => {
    switch (question.type) {
      case 'image-description':
        return 'Image Desc';
      case 'email-reply':
        return 'Email';
      case 'essay':
        return 'Essay';
      default:
        return 'Unknown';
    }
  };

  const getQuestionBadgeColor = (question: Question): string => {
    switch (question.type) {
      case 'image-description':
        return 'bg-purple-100 text-purple-700';
      case 'email-reply':
        return 'bg-blue-100 text-blue-700';
      case 'essay':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Basic Info */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{initialExam ? 'Edit Exam' : 'Create New Exam'}</h2>
        <p className="text-sm text-gray-600">
          This exam uses a fixed structure with 8 predefined questions. Complete all questions to finalize the exam.
        </p>

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
      </div>

      {/* Questions Section - Fixed 8 questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Questions (Fixed Structure)</h3>
          <span className="text-sm text-gray-600">{exam.questions.filter((q) => q.text.trim()).length} / 8 configured</span>
        </div>

        <div className="space-y-4">
          {exam.questions.map((question, index) => {
            const isEditing = editingQuestionId === question.id;
            const structure = FIXED_EXAM_STRUCTURE[index];

            return (
              <div key={question.id} className="bg-white p-4 rounded-lg border border-gray-200">
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-gray-900 text-lg">Q{index + 1}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getQuestionBadgeColor(question)}`}>
                      {getQuestionBadge(question)}
                    </span>
                    <span className="text-xs text-gray-500">{structure?.sectionLabel}</span>
                  </div>
                  <button
                    onClick={() => setEditingQuestionId(isEditing ? null : question.id)}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 shrink-0"
                  >
                    {isEditing ? 'Hide' : 'Edit'}
                  </button>
                </div>

                {/* Question Preview (when not editing) */}
                {!isEditing && (
                  <div className="text-sm text-gray-600">
                    <p className="line-clamp-2">{question.text || <span className="text-gray-400 italic">No text entered</span>}</p>
                    {question.type === 'image-description' && (
                      <p className="text-xs text-gray-500 mt-2">
                        📷 {question.images?.length || 0} image(s) • Required words: {question.requiredWords?.filter((w) => w.length > 0).length || 0}
                      </p>
                    )}
                  </div>
                )}

                {/* Question Form (when editing) */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <QuestionForm
                      question={question}
                      onSave={(updatedQuestion) => handleSaveQuestion(question.id, updatedQuestion)}
                      onCancel={() => setEditingQuestionId(null)}
                      isFixedStructure={true}
                    />
                  </div>
                )}
              </div>
            );
          })}
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
