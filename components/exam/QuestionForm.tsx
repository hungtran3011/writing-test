'use client';

import { useState, useRef } from 'react';
import { Question } from '@/lib/types';
import { fileToBase64, compressImage, estimateBase64Size, formatBytes } from '@/lib/utils/imageUtils';
import { isNearQuota } from '@/lib/utils/localStorage';

interface QuestionFormProps {
  question?: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

export default function QuestionForm({ question, onSave, onCancel }: QuestionFormProps) {
  const [text, setText] = useState(question?.text || '');
  const [image, setImage] = useState<string | undefined>(question?.image);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isNearQuota()) {
        setError('Storage nearly full. Please remove some images or data.');
        return;
      }

      let base64 = await fileToBase64(file);
      const originalSize = estimateBase64Size(base64);

      if (originalSize > 500 * 1024) {
        // Compress if larger than 500KB
        base64 = await compressImage(base64, 600, 400, 0.75);
      }

      const compressedSize = estimateBase64Size(base64);
      console.log(`Image size: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)}`);

      setImage(base64);
    } catch (err) {
      setError(`Failed to upload image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!text.trim()) {
      setError('Question text is required');
      return;
    }

    const newQuestion: Question = {
      id: question?.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text-essay',
      text: text.trim(),
      image,
      order: question?.order || 0,
    };

    onSave(newQuestion);
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="space-y-4">
        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter the question text..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Image (Optional)</label>
          {image ? (
            <div className="space-y-2">
              <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Question" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove Image
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isLoading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {isLoading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !text.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save Question
          </button>
        </div>
      </div>
    </div>
  );
}
