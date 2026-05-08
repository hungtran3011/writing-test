'use client';

import Link from 'next/link';
import { Exam } from '@/lib/types';

interface ExamListProps {
  exams: Exam[];
  collectionId: string;
  onDelete: (id: string) => void;
}

export default function ExamList({ exams, collectionId, onDelete }: ExamListProps) {
  if (exams.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500">No exams in this collection yet.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Draft</span>;
      case 'ready':
        return <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Ready</span>;
      case 'completed-locked':
        return <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">Locked</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {exams.map((exam) => (
        <div key={exam.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900 truncate">{exam.title}</h4>
                {getStatusBadge(exam.status)}
              </div>
              {exam.description && <p className="text-sm text-gray-600 mb-2 line-clamp-1">{exam.description}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{exam.questions.length} questions</span>
                <span>{exam.durationMinutes} minutes</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-shrink-0">
              {exam.status === 'completed-locked' ? (
                <Link href={`/exams/${exam.id}/result`}>
                  <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 whitespace-nowrap">
                    View Result
                  </button>
                </Link>
              ) : (
                <>
                  <Link href={`/exams/${exam.id}/take`}>
                    <button className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 whitespace-nowrap">
                      Take Exam
                    </button>
                  </Link>
                  <Link href={`/collections/${collectionId}/exams/${exam.id}/edit`}>
                    <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 whitespace-nowrap">
                      Edit
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Delete this exam?')) {
                        onDelete(exam.id);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 whitespace-nowrap"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
