import jsPDF from 'jspdf';
import { Exam, Submission } from '@/lib/types';

/**
 * Export exam and submission to PDF
 */
export async function exportExamToPDF(exam: Exam, submission: Submission, filename?: string): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Font setup
  doc.setFont('Arial');

  // Title
  doc.setFontSize(20);
  doc.setFont('Arial', 'bold');
  const titleLines = doc.splitTextToSize(`${exam.title}`, contentWidth);
  titleLines.forEach((line: string) => {
    if (yPosition + 10 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, margin, yPosition);
    yPosition += 7;
  });

  yPosition += 5;

  // Exam metadata
  doc.setFontSize(11);
  doc.setFont('Arial', 'normal');

  const metaData = [
    `Duration: ${exam.durationMinutes} minutes`,
    `Submitted: ${new Date(submission.completedAt).toLocaleString()}`,
    `Time Spent: ${formatDuration(submission.durationSeconds)}`,
  ];

  metaData.forEach((line: string) => {
    if (yPosition + 5 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  yPosition += 5;

  // Questions and Answers
  exam.questions.forEach((question, index) => {
    // Check page break
    if (yPosition + 20 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    // Question number and text
    doc.setFontSize(12);
    doc.setFont('Arial', 'bold');
    const questionHeader = `Question ${index + 1}:`;
    doc.text(questionHeader, margin, yPosition);
    yPosition += 5;

    doc.setFont('Arial', 'normal');
    doc.setFontSize(11);
    const questionLines = doc.splitTextToSize(question.text, contentWidth - 5);
    questionLines.forEach((line: string) => {
      if (yPosition + 5 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin + 5, yPosition);
      yPosition += 5;
    });

    // Image if present
    if (question.image) {
      yPosition += 3;
      try {
        const img = new Image();
        img.onload = () => {
          // Images will be added in a second pass - for now just mark space
        };
        img.src = question.image;

        if (yPosition + 50 > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }

        // For now, add a placeholder for images
        // Full image support requires async handling
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('[Image embedded]', margin + 5, yPosition);
        doc.setTextColor(0);
        yPosition += 10;
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }

    // Answer
    yPosition += 3;
    doc.setFontSize(11);
    doc.setFont('Arial', 'italic');
    const answer = submission.answers.find((a) => a.questionId === question.id);
    if (answer) {
      const answerLines = doc.splitTextToSize(`Answer: ${answer.text}`, contentWidth - 5);
      answerLines.forEach((line: string) => {
        if (yPosition + 5 > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
    }

    yPosition += 8;
  });

  // Footer
  yPosition += 5;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('Arial', 'normal');
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, yPosition);

  // Save PDF
  const pdfFilename = filename || `exam_${exam.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(pdfFilename);
}

/**
 * Format seconds to human readable duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
