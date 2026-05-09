'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Collection, Exam } from '@/lib/types';
import { getCollection } from '@/lib/storage/collectionStorage';
import { getExamsByCollection, saveExam, deleteExam } from '@/lib/storage/examStorage';
import ExamForm from '@/components/exam/ExamForm';
import ExamList from '@/components/collection/ExamList';

interface PageParams {
  params: Promise<{ id: string }>;
}

export default function CollectionDetailPage({ params }: PageParams) {
  const [paramId, setParamId] = useState<string | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [showNewExamForm, setShowNewExamForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load params
  useEffect(() => {
    (async () => {
      try {
        const p = await params;
        setParamId(p.id);
      } catch (err) {
        console.error('Failed to get params', err);
        setError('Invalid collection ID');
      }
    })();
  }, [params]);

  // Load collection data
  useEffect(() => {
    if (!paramId) return;

    const loadData = async () => {
      try {
        const col = await getCollection(paramId);
        if (!col) {
          setError('Collection not found');
          setCollection(null);
          setExams([]);
        } else {
          setCollection(col);
          const examsData = await getExamsByCollection(paramId);
          setExams(examsData);
          setError(null);
        }
      } catch (err) {
        setError(`Failed to load collection: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [paramId]);

  const handleSaveExam = async (exam: Exam) => {
    try {
      await saveExam(exam);
      setExams(await getExamsByCollection(paramId!));
      setShowNewExamForm(false);
    } catch (err) {
      setError(`Failed to save exam: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteExam = async (id: string) => {
    try {
      await deleteExam(id);
      setExams(exams.filter((e) => e.id !== id));
    } catch (err) {
      setError(`Failed to delete exam: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return <div className="w-full px-4 py-8 sm:px-6 lg:px-8">Loading...</div>;
  }

  if (!collection) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          Collection not found. <Link href="/" className="text-red-600 hover:text-red-700 font-medium">Go back</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb & Header */}
      <div className="mb-8">
        <Link href="/" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Collections
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{collection.name}</h1>
        {collection.description && <p className="text-gray-600">{collection.description}</p>}
      </div>

      {/* Error Message */}
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>}

      {/* Exam Form or List */}
      {showNewExamForm ? (
        <div className="mb-8">
          <ExamForm
            collectionId={collection.id}
            onSave={handleSaveExam}
            onCancel={() => setShowNewExamForm(false)}
          />
        </div>
      ) : (
        <>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Exams ({exams.length})</h2>
            <button
              onClick={() => setShowNewExamForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + New Exam
            </button>
          </div>

          <ExamList exams={exams} collectionId={collection.id} onDelete={handleDeleteExam} />
        </>
      )}
    </main>
  );
}
