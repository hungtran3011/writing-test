'use client';

import { useState, useEffect } from 'react';
import { Collection } from '@/lib/types';
import { getAllCollections, createCollection, saveCollection, deleteCollection } from '@/lib/storage/collectionStorage';
import CollectionList from '@/components/collection/CollectionList';

export default function Home() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const data = await getAllCollections();
        setCollections(data);
      } catch (err) {
        console.error('Failed to load collections:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCollections();
  }, []);

  const handleCreateCollection = async () => {
    setError(null);

    if (!newCollectionName.trim()) {
      setError('Collection name is required');
      return;
    }

    try {
      const newCollection = createCollection(newCollectionName, newCollectionDesc);
      await saveCollection(newCollection);
      setCollections([...collections, newCollection]);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setShowNewCollectionForm(false);
    } catch (err) {
      setError(`Failed to create collection: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollection(id);
      setCollections(collections.filter((c) => c.id !== id));
    } catch (err) {
      setError(`Failed to delete collection: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return <main className="w-full px-4 py-8 sm:px-6 lg:px-8">Loading...</main>;
  }

  return (
    <main className="w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Collections</h1>
        <p className="text-gray-600">Create and manage your exam collections</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>
      )}

      {/* New Collection Form */}
      {showNewCollectionForm ? (
        <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Create New Collection</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Collection Name *</label>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g., English Class - Spring 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={newCollectionDesc}
              onChange={(e) => setNewCollectionDesc(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowNewCollectionForm(false);
                setNewCollectionName('');
                setNewCollectionDesc('');
                setError(null);
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCollection}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Collection
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewCollectionForm(true)}
          className="mb-8 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          + New Collection
        </button>
      )}

      {/* Collections List */}
      <CollectionList collections={collections} onDelete={handleDeleteCollection} />
    </main>
  );
}
