'use client';

import Link from 'next/link';
import { Collection } from '@/lib/types';

interface CollectionListProps {
  collections: Collection[];
  onDelete: (id: string) => void;
}

export default function CollectionList({ collections, onDelete }: CollectionListProps) {
  if (collections.length === 0) {
    return (
      <div className="bg-gray-50 p-12 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500 mb-4">No collections yet. Create your first collection to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((collection) => (
        <Link key={collection.id} href={`/collections/${collection.id}`}>
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer h-full">
            <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{collection.name}</h3>
            {collection.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{collection.description}</p>
            )}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                {new Date(collection.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm('Delete this collection? All exams and submissions will be removed.')) {
                    onDelete(collection.id);
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
