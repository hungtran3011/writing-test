'use client';

import { useState, useRef } from 'react';
import { Question } from '@/lib/types';
import { fileToBase64, compressImage, estimateBase64Size, formatBytes } from '@/lib/utils/imageUtils';
import { isNearQuota } from '@/lib/utils/localStorage';

interface QuestionFormProps {
  question?: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
  isFixedStructure?: boolean; // If true, type selector is hidden (type is predetermined)
}

export default function QuestionForm({ question, onSave, onCancel, isFixedStructure = false }: QuestionFormProps) {
  const [text, setText] = useState(question?.text || '');
  const [type] = useState<Question['type']>(question?.type || 'text-essay');
  const [image, setImage] = useState<string | undefined>(question?.image);
  const [images, setImages] = useState<string[]>(question?.images ? [...question.images] : []);
  const [requiredWords, setRequiredWords] = useState<string[][]>(
    question?.requiredWords ? question.requiredWords.map((w) => [...w]) : []
  );
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | undefined>(question?.timeLimitSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);

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

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      if (isNearQuota()) {
        setError('Storage nearly full. Please remove some images or data.');
        return;
      }

      for (const file of files) {
        let base64 = await fileToBase64(file);
        const originalSize = estimateBase64Size(base64);

        if (originalSize > 500 * 1024) {
          base64 = await compressImage(base64, 800, 600, 0.8);
        }

        setImages((prev) => [...prev, base64]);
        setRequiredWords((prev) => [...prev, ['', '']]);
      }
    } catch (err) {
      setError(`Failed to upload images: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      if (multiFileRef.current) multiFileRef.current.value = '';
    }
  };

  const removeImageAt = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setRequiredWords((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (from: number, to: number) => {
    setImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    setRequiredWords((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const handleSave = () => {
    if (!text.trim()) {
      setError('Question text is required');
      return;
    }

    const id = question?.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const base: Partial<Question> = {
      id,
      type,
      text: text.trim(),
      order: question?.order || 0,
      position: question?.position,
      sectionLabel: question?.sectionLabel,
      timeLimitSeconds: question?.timeLimitSeconds,
    };

    let newQuestion: Question;

    if (type === 'image-description') {
      if (images.length === 0) {
        setError('Please add at least one image for this question.');
        return;
      }
      // Validate that each image has required words
      for (let i = 0; i < images.length; i++) {
        if (!requiredWords[i] || requiredWords[i].length === 0 || requiredWords[i].every((w) => !w.trim())) {
          setError(`Image ${i + 1} must have at least one required word`);
          return;
        }
      }
      newQuestion = {
        ...(base as Question),
        images,
        requiredWords,
      } as Question;
    } else if (type === 'email-reply') {
      newQuestion = {
        ...(base as Question),
      } as Question;
    } else if (type === 'essay') {
      newQuestion = {
        ...(base as Question),
      } as Question;
    } else {
      // text-essay
      newQuestion = {
        ...(base as Question),
        image,
      } as Question;
    }

    onSave(newQuestion);
  };

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {type === 'image-description'
            ? 'Image Description Prompt *'
            : type === 'email-reply'
            ? 'Email Reply Prompt *'
            : type === 'essay'
            ? 'Essay Prompt *'
            : 'Question Text *'}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            type === 'image-description'
              ? 'Enter what the student should describe about the image...'
              : type === 'email-reply'
              ? 'Enter the email to reply to, and instructions...'
              : type === 'essay'
              ? 'Enter the essay topic and instructions...'
              : 'Enter the question text...'
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      </div>

      {/* Image Description Type - Multiple Images with Required Words */}
      {type === 'image-description' && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-md border border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Images *</label>
            <input
              ref={multiFileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultiUpload}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Each image should have 2 required words</p>
          </div>

          {images.length === 0 && <p className="text-sm text-gray-500 italic">No images added yet.</p>}

          {images.map((img, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded border border-gray-200">
              <div className="w-24 h-18 bg-gray-100 rounded overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-2">Image {idx + 1}</p>
                <div className="flex gap-2 mb-2">
                  <input
                    value={requiredWords[idx]?.[0] || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRequiredWords((prev) => {
                        const copy = prev.map((r) => [...r]);
                        copy[idx] = [v, copy[idx]?.[1] || ''];
                        return copy;
                      });
                    }}
                    placeholder="Required word 1"
                    className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                  />
                  <input
                    value={requiredWords[idx]?.[1] || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRequiredWords((prev) => {
                        const copy = prev.map((r) => [...r]);
                        copy[idx] = [copy[idx]?.[0] || '', v];
                        return copy;
                      });
                    }}
                    placeholder="Required word 2"
                    className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => removeImageAt(idx)} className="text-xs text-red-600 hover:text-red-700">
                    Remove
                  </button>
                  {idx > 0 && (
                    <button type="button" onClick={() => moveImage(idx, idx - 1)} className="text-xs text-gray-600 hover:text-gray-700">
                      ↑ Up
                    </button>
                  )}
                  {idx < images.length - 1 && (
                    <button type="button" onClick={() => moveImage(idx, idx + 1)} className="text-xs text-gray-600 hover:text-gray-700">
                      ↓ Down
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Reply Type */}
      {type === 'email-reply' && (
        <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-gray-600">
            Students will see this email prompt and write their reply in the response box below it during the exam.
          </p>
        </div>
      )}

      {/* Essay Type */}
      {type === 'essay' && (
        <div className="p-4 bg-amber-50 rounded-md border border-amber-200">
          <p className="text-sm text-gray-600">
            Students will write an essay in response to this prompt. No minimum word count requirement.
          </p>
        </div>
      )}

      {/* Text Essay Type - Single Image */}
      {type === 'text-essay' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Image (Optional)</label>
          {image ? (
            <div className="space-y-2">
              <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Question" className="w-full h-full object-cover" />
              </div>
              <button type="button" onClick={handleRemoveImage} className="text-sm text-red-600 hover:text-red-700">
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
      )}

      {/* Error Message */}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
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
  );
}
