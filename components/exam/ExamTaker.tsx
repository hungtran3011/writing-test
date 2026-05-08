'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Exam, Question } from '@/lib/types';

/* ─── public props ─── */
interface ExamTakerProps {
  exam: Exam;
  answers: Record<string, string>; // questionId -> answer text
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
  /** Called when the last section's timer expires or user advances past it */
  onExamComplete?: () => void;
  /** Action buttons to render in the top right corner */
  actionButtons?: React.ReactNode;
}

/* ─── internal types ─── */
interface SectionDef {
  label: string;
  questions: Question[];
  timeLimitSeconds?: number;
}

interface QuestionProps {
  question: Question;
  sectionIndex: number;
  sectionTotal: number;
  answer: string;
  isLocked: boolean;
  onAnswerChange: (questionId: string, text: string) => void;
  navigationBar?: React.ReactNode;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ExamTaker – TOEIC Writing–style section navigator
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ExamTaker({
  exam,
  answers,
  isLocked,
  onAnswerChange,
  onExamComplete,
  actionButtons,
}: ExamTakerProps) {
  /* ── build sections ── */
  const sections: SectionDef[] = useMemo(() => {
    const map = new Map<string, Question[]>();
    exam.questions.forEach((q) => {
      const label = q.sectionLabel || `Q${q.position || q.order + 1}`;
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(q);
    });
    return Array.from(map.entries()).map(([label, questions]) => ({
      label,
      questions,
      timeLimitSeconds: questions[0]?.timeLimitSeconds,
    }));
  }, [exam.questions]);

  /* ── navigation state ── */
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(
    () => new Set(),
  );
  const [showConfirm, setShowConfirm] = useState(false);

  const section = sections[currentSectionIdx];
  const question = section?.questions[currentQuestionIdx];
  const isLastSection = currentSectionIdx === sections.length - 1;

  /* ── question navigation (same section) ── */
  const goToPrevQuestion = useCallback(() => {
    setCurrentQuestionIdx((i) => Math.max(0, i - 1));
  }, []);

  const goToNextQuestion = useCallback(() => {
    if (!section) return;
    setCurrentQuestionIdx((i) =>
      Math.min(section.questions.length - 1, i + 1),
    );
  }, [section]);

  /* ── section navigation (forward-only) ── */
  const advanceSection = useCallback(() => {
    setShowConfirm(false);
    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.add(currentSectionIdx);
      return next;
    });

    if (isLastSection) {
      // Finished last section → trigger exam submit
      onExamComplete?.();
    } else {
      setCurrentSectionIdx((i) => i + 1);
      setCurrentQuestionIdx(0);
    }
  }, [currentSectionIdx, isLastSection, onExamComplete]);

  const requestAdvanceSection = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const cancelAdvance = useCallback(() => {
    setShowConfirm(false);
  }, []);

  /* ── called when section timer runs out ── */
  const handleSectionTimeUp = useCallback(() => {
    advanceSection();
  }, [advanceSection]);

  /* ── don't render if locked ── */
  if (!section || !question) return null;

  return (
    <div className="w-full space-y-0">
      {/* ═══ Top Header (Title + Timer + Actions) ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          {exam.description && <p className="text-gray-600 mt-1">{exam.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {section.timeLimitSeconds != null && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Time Left:</span>
              <SectionTimer
                key={section.label}
                timeLimitSeconds={section.timeLimitSeconds}
                isActive={!completedSections.has(currentSectionIdx) && !isLocked}
                onTimeUp={handleSectionTimeUp}
              />
            </div>
          )}
          {actionButtons}
        </div>
      </div>

      {/* ═══ Section Indicator Bar ═══ */}
      <SectionIndicator
        sections={sections}
        currentSectionIdx={currentSectionIdx}
        completedSections={completedSections}
      />

      {/* ═══ Active Section ═══ */}
      <div className="bg-blue-50 p-6 rounded-b-lg border-2 border-t-0 border-blue-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{section.label}</h2>

        {/* Single question renderer */}
        <div className="mt-4">
          <QuestionRenderer
            question={question}
            sectionIndex={currentQuestionIdx}
            sectionTotal={section.questions.length}
            answer={answers[question.id] || ''}
            isLocked={isLocked || completedSections.has(currentSectionIdx)}
            onAnswerChange={onAnswerChange}
            navigationBar={
              <NavigationBar
                currentQuestionIdx={currentQuestionIdx}
                totalQuestions={section.questions.length}
                isLastSection={isLastSection}
                isLocked={isLocked || completedSections.has(currentSectionIdx)}
                onPrevQuestion={goToPrevQuestion}
                onNextQuestion={goToNextQuestion}
                onNextSection={requestAdvanceSection}
              />
            }
          />
        </div>
      </div>

      {/* ═══ Confirm Dialog ═══ */}
      {showConfirm && (
        <ConfirmDialog
          isLastSection={isLastSection}
          onConfirm={advanceSection}
          onCancel={cancelAdvance}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Indicator – shows which section is active / completed
   ═══════════════════════════════════════════════════════════════════════════ */
function SectionIndicator({
  sections,
  currentSectionIdx,
  completedSections,
}: {
  sections: SectionDef[];
  currentSectionIdx: number;
  completedSections: Set<number>;
}) {
  return (
    <div className="flex bg-white rounded-t-lg border-2 border-blue-200 overflow-hidden">
      {sections.map((s, i) => {
        const isCompleted = completedSections.has(i);
        const isCurrent = i === currentSectionIdx;
        let cls =
          'flex-1 py-3 px-4 text-center text-sm font-semibold transition-colors border-r last:border-r-0 border-blue-200';
        if (isCurrent) cls += ' bg-blue-600 text-white';
        else if (isCompleted) cls += ' bg-gray-200 text-gray-500';
        else cls += ' bg-white text-gray-400';

        return (
          <div key={s.label} className={cls}>
            <span className="block truncate">
              {isCompleted && '✓ '}
              {s.label}
            </span>
            {s.timeLimitSeconds != null && (
              <span className="block text-xs mt-0.5 opacity-75">
                {Math.floor(s.timeLimitSeconds / 60)} min
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Timer – countdown for one section only
   ═══════════════════════════════════════════════════════════════════════════ */
function SectionTimer({
  timeLimitSeconds,
  isActive,
  onTimeUp,
}: {
  timeLimitSeconds: number;
  isActive: boolean;
  onTimeUp: () => void;
}) {
  const [remaining, setRemaining] = useState(timeLimitSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isActive || firedRef.current) return;

    const timer = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          clearInterval(timer);
          if (!firedRef.current) {
            firedRef.current = true;
            // Fire on next tick to avoid React state-during-render warnings
            setTimeout(() => onTimeUpRef.current(), 0);
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formatted = `${mins}:${String(secs).padStart(2, '0')}`;

  const isWarning = remaining <= 60;
  const isUrgent = remaining <= 30;

  const barPct = Math.max(0, (remaining / timeLimitSeconds) * 100);

  return (
    <div className="flex flex-row items-center gap-3">
      <div
        className={`text-lg font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
          isUrgent
            ? 'bg-red-100 text-red-700 animate-pulse'
            : isWarning
              ? 'bg-orange-100 text-orange-700'
              : 'bg-blue-100 text-blue-700'
        }`}
      >
        <span>⏱</span>
        <span>{formatted}</span>
      </div>
      {/* mini progress bar */}
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isUrgent
              ? 'bg-red-500'
              : isWarning
                ? 'bg-orange-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Navigation Bar
   ═══════════════════════════════════════════════════════════════════════════ */
function NavigationBar({
  currentQuestionIdx,
  totalQuestions,
  isLastSection,
  isLocked,
  onPrevQuestion,
  onNextQuestion,
  onNextSection,
}: {
  currentQuestionIdx: number;
  totalQuestions: number;
  isLastSection: boolean;
  isLocked: boolean;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  onNextSection: () => void;
}) {
  const isFirstQ = currentQuestionIdx === 0;
  const isLastQ = currentQuestionIdx === totalQuestions - 1;

  return (
    <div className="flex items-center justify-between w-full">
      {/* Prev question */}
      <button
        onClick={onPrevQuestion}
        disabled={isFirstQ || isLocked}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        ← Câu trước
      </button>

      {/* Question indicator */}
      <div className="flex items-center gap-2 px-2">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <span
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentQuestionIdx
                ? 'bg-blue-600 scale-125'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Right-side buttons */}
      <div className="flex gap-2">
        {!isLocked && (
          <>
            {!isLastQ ? (
              <button
                onClick={onNextQuestion}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700"
              >
                Câu tiếp →
              </button>
            ) : (
              <button
                onClick={onNextSection}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isLastSection
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLastSection ? 'Nộp bài ✓' : 'Section tiếp →'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Confirm Dialog – warning before advancing section
   ═══════════════════════════════════════════════════════════════════════════ */
function ConfirmDialog({
  isLastSection,
  onConfirm,
  onCancel,
}: {
  isLastSection: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {isLastSection ? '⚠️ Nộp bài?' : '⚠️ Chuyển section?'}
        </h3>
        <p className="text-gray-600 mb-6">
          {isLastSection
            ? 'Bạn sẽ nộp bài thi. Không thể chỉnh sửa sau khi nộp.'
            : 'Bạn không thể quay lại section này sau khi chuyển. Bạn có chắc chắn muốn tiếp tục?'}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-lg font-semibold text-white transition-colors ${
              isLastSection
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLastSection ? 'Nộp bài' : 'Tiếp tục'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Question Renderers – Splitted into Left (Prompt) and Right (Answer & Nav)
   ═══════════════════════════════════════════════════════════════════════════ */

function QuestionRenderer(props: QuestionProps) {
  if (props.question.type === 'image-description') {
    return <ImageDescriptionQuestion {...props} />;
  }

  if (props.question.type === 'email-reply') {
    return <EmailReplyQuestion {...props} />;
  }

  if (props.question.type === 'essay') {
    return <EssayQuestion {...props} />;
  }

  // Default: text-essay
  return <TextEssayQuestion {...props} />;
}

function TextEssayQuestion({
  question,
  sectionIndex,
  sectionTotal,
  answer,
  isLocked,
  onAnswerChange,
  navigationBar,
}: QuestionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 grid grid-cols-1 lg:grid-cols-2 shadow-sm overflow-hidden">
      {/* Left: Question */}
      <div className="p-6 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <p className="text-gray-700 whitespace-pre-wrap flex-1">{question.text}</p>
        
        {question.image && (
          <div className="mt-4 min-h-[16rem] bg-gray-100 rounded-lg overflow-hidden relative border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={question.image} alt="Question" className="w-full h-full object-contain absolute inset-0" />
          </div>
        )}
      </div>

      {/* Right: Answer & Nav */}
      <div className="p-6 flex flex-col bg-white">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Answer</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Section completed - cannot edit' : 'Type your answer here...'}
          className={`flex-1 w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[16rem] transition-colors ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
        />
        <div className="flex justify-end mt-2">
          <p className="text-xs text-gray-500 font-medium">{answer?.length || 0} characters</p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100">
          {navigationBar}
        </div>
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
  navigationBar,
}: QuestionProps) {
  const images = question.images || [];
  const required = question.requiredWords || [];
  const [pos, setPos] = useState(0);
  const total = images.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 grid grid-cols-1 lg:grid-cols-2 shadow-sm overflow-hidden">
      {/* Left: Question & Image */}
      <div className="p-6 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <p className="text-gray-700">{question.text}</p>

        {total > 0 && (
          <div className="mt-4 flex flex-col flex-1">
            <div className="h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[pos]} alt={`img-${pos}`} className="w-full h-full object-contain absolute inset-0" />
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <button onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos === 0} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium text-sm rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:bg-gray-100">
                  ← Prev
                </button>
                <button onClick={() => setPos((p) => Math.min(total - 1, p + 1))} disabled={pos === total - 1} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium text-sm rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:bg-gray-100">
                  Next →
                </button>
              </div>
              <span className="text-sm font-medium text-gray-600">Image {pos + 1} of {total}</span>
            </div>

            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <strong className="text-sm text-purple-900 block mb-2">Required words for Image {pos + 1}:</strong>
              <div className="flex flex-wrap gap-2">
                {(required[pos] || []).map((w, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm rounded-md font-medium transition-colors bg-white text-gray-700 border border-gray-300"
                  >
                    {w || '(not set)'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Answer & Nav */}
      <div className="p-6 flex flex-col bg-white">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Description</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Section completed - cannot edit' : 'Describe the images here...'}
          className={`flex-1 w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[16rem] transition-colors ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
        />
        <div className="flex justify-end mt-2">
          <p className="text-xs text-gray-500 font-medium">{answer?.length || 0} characters</p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100">
          {navigationBar}
        </div>
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
  navigationBar,
}: QuestionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 grid grid-cols-1 lg:grid-cols-2 shadow-sm overflow-hidden">
      {/* Left: Email content */}
      <div className="p-6 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <div className="mt-2 p-5 bg-white rounded-lg border border-gray-200 shadow-sm flex-1 overflow-auto">
          <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">{question.text}</p>
        </div>
      </div>

      {/* Right: Answer & Nav */}
      <div className="p-6 flex flex-col bg-white">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Email Reply</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Section completed - cannot edit' : 'Type your email reply here...'}
          className={`flex-1 w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[20rem] transition-colors ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
        />
        <div className="flex justify-end mt-2">
          <p className="text-xs text-gray-500 font-medium">{answer?.length || 0} characters</p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100">
          {navigationBar}
        </div>
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
  navigationBar,
}: QuestionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 grid grid-cols-1 lg:grid-cols-2 shadow-sm overflow-hidden">
      {/* Left: Topic */}
      <div className="p-6 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Question {sectionIndex + 1}{sectionTotal > 1 ? ` of ${sectionTotal}` : ''}
        </h3>
        <div className="mt-2 p-5 bg-white rounded-lg border border-gray-200 shadow-sm flex-1">
          <p className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap font-medium">{question.text}</p>
        </div>
      </div>

      {/* Right: Answer & Nav */}
      <div className="p-6 flex flex-col bg-white">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Essay</label>
        <textarea
          value={answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? 'Section completed - cannot edit' : 'Write your essay here...'}
          className={`flex-1 w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[24rem] transition-colors leading-relaxed ${
            isLocked ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
          }`}
        />
        <div className="mt-2 flex justify-between items-center px-1">
          <p className="text-xs text-gray-500 font-medium">{answer?.length || 0} characters</p>
          <p className="text-xs text-gray-500 font-medium">{answer?.split(/\s+/).filter(Boolean).length || 0} words</p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100">
          {navigationBar}
        </div>
      </div>
    </div>
  );
}
