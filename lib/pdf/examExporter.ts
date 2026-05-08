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

    // Handle images and required words
    const imagesToRender: { src: string; requiredWords: string[] | null }[] = [];
    if (question.image) {
      imagesToRender.push({ src: question.image, requiredWords: null });
    } else if (question.images && question.images.length > 0) {
      question.images.forEach((img, i) => {
        imagesToRender.push({
          src: img,
          requiredWords: question.requiredWords && question.requiredWords[i] ? question.requiredWords[i].filter(Boolean) : null
        });
      });
    }

    imagesToRender.forEach((imgData, i) => {
      // Check page break for image
      if (yPosition + 60 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      try {
        let format = 'JPEG';
        if (imgData.src.startsWith('data:image/')) {
          const match = imgData.src.match(/data:image\/([a-zA-Z]+);base64/);
          if (match) {
            format = match[1].toUpperCase();
            if (format === 'SVG+XML') format = 'SVG';
          }
        }
        
        // Render image (width 80, height 50)
        doc.addImage(imgData.src, format, margin + 5, yPosition, 80, 50);
        yPosition += 55;
      } catch (err) {
        console.error('Error rendering image to PDF:', err);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`[Image ${i + 1} embedded]`, margin + 5, yPosition);
        doc.setTextColor(0);
        yPosition += 10;
      }

      // Required words
      if (imgData.requiredWords && imgData.requiredWords.length > 0) {
        doc.setFontSize(10);
        doc.setFont('Arial', 'bold');
        doc.text(`Required words:`, margin + 5, yPosition);
        doc.setFont('Arial', 'normal');
        doc.text(imgData.requiredWords.join(', '), margin + 35, yPosition);
        yPosition += 8;
      }
    });

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
