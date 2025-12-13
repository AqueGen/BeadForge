/**
 * PDF Generator for BeadForge patterns
 * Generates multi-page PDFs with title page, grid view, and RLE tables
 */

import jsPDF from 'jspdf';
import { BeadPattern, BeadColor } from '@/types';
import {
  createColorLetterMappings,
  getLetterForColorIndex,
  getContrastingTextColor,
  ColorLetterMapping,
} from './colorLetterMapping';

export type PrintMode = 'fullColor' | 'economical' | 'blackWhite';
export type PaperSize = 'a4' | 'letter';

export interface PDFExportOptions {
  printMode: PrintMode;
  paperSize: PaperSize;
  includeGrid: boolean;
  includeRLE: boolean;
  includeTitlePage: boolean;
  includeSimulationPreview: boolean;
  cellSize: number; // mm
  showRowNumbers: boolean;
  showCheckboxes: boolean;
  patternUrl?: string; // For QR code
}

const DEFAULT_OPTIONS: PDFExportOptions = {
  printMode: 'fullColor',
  paperSize: 'a4',
  includeGrid: true,
  includeRLE: true,
  includeTitlePage: true,
  includeSimulationPreview: true,
  cellSize: 4,
  showRowNumbers: true,
  showCheckboxes: true,
};

// Paper dimensions in mm
const PAPER_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

// Margins in mm
const MARGINS = {
  top: 15,
  bottom: 15,
  left: 15,
  right: 15,
};

interface PageDimensions {
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
  orientation: 'portrait' | 'landscape';
}

/**
 * Calculate optimal page orientation based on pattern dimensions
 */
function calculatePageDimensions(
  pattern: BeadPattern,
  options: PDFExportOptions
): PageDimensions {
  const paper = PAPER_SIZES[options.paperSize];
  const patternWidthMm = pattern.width * options.cellSize;

  // Add extra space for row numbers and checkboxes
  const extraWidth = (options.showRowNumbers ? 10 : 0) + (options.showCheckboxes ? 8 : 0);
  const totalWidthNeeded = patternWidthMm + extraWidth;

  // Choose orientation based on pattern width
  const portraitContentWidth = paper.width - MARGINS.left - MARGINS.right;
  const landscapeContentWidth = paper.height - MARGINS.left - MARGINS.right;

  const orientation: 'portrait' | 'landscape' =
    totalWidthNeeded > portraitContentWidth && totalWidthNeeded <= landscapeContentWidth
      ? 'landscape'
      : 'portrait';

  const width = orientation === 'portrait' ? paper.width : paper.height;
  const height = orientation === 'portrait' ? paper.height : paper.width;

  return {
    width,
    height,
    contentWidth: width - MARGINS.left - MARGINS.right,
    contentHeight: height - MARGINS.top - MARGINS.bottom,
    orientation,
  };
}

/**
 * Draw title page with metadata, legend, and statistics
 */
function drawTitlePage(
  doc: jsPDF,
  pattern: BeadPattern,
  mappings: ColorLetterMapping[],
  dims: PageDimensions,
  options: PDFExportOptions
): void {
  let y = MARGINS.top;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(pattern.name || 'Untitled Pattern', MARGINS.left, y + 8);
  y += 15;

  // Author
  if (pattern.author) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text(`Author: ${pattern.author}`, MARGINS.left, y + 4);
    y += 8;
  }

  // Metadata section
  y += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const metadata = [
    `Beads per row: ${pattern.width}`,
    `Number of rows: ${pattern.height}`,
    `Total beads: ${pattern.width * pattern.height}`,
    `Colors used: ${mappings.length}`,
  ];

  metadata.forEach(line => {
    doc.text(line, MARGINS.left, y + 4);
    y += 6;
  });

  // Notes
  if (pattern.notes) {
    y += 5;
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize(pattern.notes, dims.contentWidth);
    doc.text(noteLines, MARGINS.left, y + 4);
    y += noteLines.length * 5 + 5;
  }

  // Color Legend
  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Color Legend', MARGINS.left, y + 5);
  y += 12;

  // Draw color swatches with letters and counts
  const swatchSize = 8;
  const colsPerRow = Math.floor(dims.contentWidth / 50);
  let col = 0;

  doc.setFontSize(9);
  mappings.forEach((mapping, index) => {
    const x = MARGINS.left + (col * 50);
    const rowOffset = Math.floor(index / colsPerRow) * 14;
    const currentY = y + rowOffset;

    // Color swatch
    if (options.printMode === 'fullColor') {
      doc.setFillColor(mapping.color.r, mapping.color.g, mapping.color.b);
      doc.rect(x, currentY, swatchSize, swatchSize, 'F');
    }
    doc.setDrawColor(100, 100, 100);
    doc.rect(x, currentY, swatchSize, swatchSize, 'S');

    // Letter inside swatch
    doc.setFont('helvetica', 'bold');
    const textColor = options.printMode === 'fullColor'
      ? getContrastingTextColor(mapping.color)
      : 'black';
    doc.setTextColor(textColor === 'white' ? 255 : 0);
    doc.text(mapping.letter, x + swatchSize / 2, currentY + swatchSize / 2 + 1, { align: 'center' });

    // Count
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`${mapping.count}`, x + swatchSize + 2, currentY + swatchSize / 2 + 1);

    col = (col + 1) % colsPerRow;
  });

  y += Math.ceil(mappings.length / colsPerRow) * 14 + 15;

  // Pie chart - color distribution
  if (y + 60 < dims.height - MARGINS.bottom) {
    drawColorPieChart(doc, mappings, MARGINS.left + 40, y + 30, 25, options);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Color Distribution', MARGINS.left + 40, y + 60, { align: 'center' });
  }

  // Print mode indicator
  doc.setFontSize(8);
  doc.setTextColor(128);
  const modeText = {
    fullColor: 'Full Color Print',
    economical: 'Ink-Saving Mode',
    blackWhite: 'Black & White',
  }[options.printMode];
  doc.text(modeText, dims.width - MARGINS.right, dims.height - MARGINS.bottom + 5, { align: 'right' });

  // Page number
  doc.text('Page 1', dims.width / 2, dims.height - MARGINS.bottom + 5, { align: 'center' });
  doc.setTextColor(0);
}

/**
 * Draw a simple pie chart showing color distribution
 */
function drawColorPieChart(
  doc: jsPDF,
  mappings: ColorLetterMapping[],
  cx: number,
  cy: number,
  radius: number,
  options: PDFExportOptions
): void {
  const total = mappings.reduce((sum, m) => sum + m.count, 0);
  let startAngle = -Math.PI / 2; // Start from top

  mappings.forEach(mapping => {
    const sliceAngle = (mapping.count / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    // Draw pie slice
    if (options.printMode === 'fullColor') {
      doc.setFillColor(mapping.color.r, mapping.color.g, mapping.color.b);
    } else {
      // Use grayscale for economical/b&w
      const gray = Math.round(0.299 * mapping.color.r + 0.587 * mapping.color.g + 0.114 * mapping.color.b);
      doc.setFillColor(gray, gray, gray);
    }

    // Draw pie slice as triangle (simplified approximation)
    doc.setDrawColor(255, 255, 255);
    if (sliceAngle > 0.01) {
      doc.triangle(
        cx, cy,
        cx + radius * Math.cos(startAngle), cy + radius * Math.sin(startAngle),
        cx + radius * Math.cos(endAngle), cy + radius * Math.sin(endAngle),
        'F'
      );
    }

    startAngle = endAngle;
  });

  // Draw circle outline
  doc.setDrawColor(100, 100, 100);
  doc.circle(cx, cy, radius, 'S');
}

/**
 * Draw grid pages with pattern cells, letters, row numbers
 */
function drawGridPages(
  doc: jsPDF,
  pattern: BeadPattern,
  mappings: ColorLetterMapping[],
  dims: PageDimensions,
  options: PDFExportOptions,
  startPage: number
): number {
  const cellSize = options.cellSize;
  const rowNumberWidth = options.showRowNumbers ? 10 : 0;
  const checkboxWidth = options.showCheckboxes ? 8 : 0;

  // Calculate how many rows fit per page
  const headerHeight = 10;
  const availableHeight = dims.contentHeight - headerHeight;
  const rowsPerPage = Math.floor(availableHeight / cellSize);

  // Calculate grid offset for centering
  const gridWidth = pattern.width * cellSize;
  const totalWidth = rowNumberWidth + gridWidth + checkboxWidth;
  const startX = MARGINS.left + Math.max(0, (dims.contentWidth - totalWidth) / 2);

  let currentPage = startPage;
  let rowStart = 0;

  while (rowStart < pattern.height) {
    if (currentPage > startPage) {
      doc.addPage(dims.orientation === 'landscape' ? 'landscape' : 'portrait');
    }

    const rowEnd = Math.min(rowStart + rowsPerPage, pattern.height);
    let y = MARGINS.top + headerHeight;

    // Page header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pattern.name} - Rows ${rowStart + 1}-${rowEnd}`, MARGINS.left, MARGINS.top + 5);

    // Draw rows
    for (let row = rowStart; row < rowEnd; row++) {
      let x = startX;

      // Row number
      if (options.showRowNumbers) {
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`${row + 1}`, x + rowNumberWidth - 2, y + cellSize / 2 + 1, { align: 'right' });
        doc.setTextColor(0);
        x += rowNumberWidth;
      }

      // Draw cells for this row
      for (let col = 0; col < pattern.width; col++) {
        const fieldIndex = row * pattern.width + col;
        const colorIndex = pattern.field[fieldIndex];
        const color = pattern.colors[colorIndex];
        const letter = getLetterForColorIndex(mappings, colorIndex);

        // Cell background
        if (options.printMode === 'fullColor' && color) {
          doc.setFillColor(color.r, color.g, color.b);
          doc.rect(x, y, cellSize, cellSize, 'F');
        } else if (options.printMode === 'economical' && color) {
          // Light fill for economical mode
          const gray = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
          if (gray < 200) {
            doc.setFillColor(230, 230, 230);
            doc.rect(x, y, cellSize, cellSize, 'F');
          }
        }

        // Cell border
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.1);
        doc.rect(x, y, cellSize, cellSize, 'S');

        // Letter
        if (cellSize >= 3) {
          const fontSize = Math.min(cellSize * 0.7, 6);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'bold');

          if (options.printMode === 'fullColor' && color) {
            const textColor = getContrastingTextColor(color);
            doc.setTextColor(textColor === 'white' ? 255 : 0);
          } else {
            doc.setTextColor(0);
          }

          doc.text(letter, x + cellSize / 2, y + cellSize / 2 + fontSize / 4, { align: 'center' });
          doc.setTextColor(0);
        }

        x += cellSize;
      }

      // Checkbox for progress tracking
      if (options.showCheckboxes) {
        x += 2;
        doc.setDrawColor(150, 150, 150);
        doc.rect(x, y + (cellSize - 3) / 2, 3, 3, 'S');
      }

      y += cellSize;
    }

    // Page footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Page ${currentPage}`, dims.width / 2, dims.height - MARGINS.bottom + 5, { align: 'center' });
    doc.setTextColor(0);

    rowStart = rowEnd;
    currentPage++;
  }

  return currentPage;
}

/**
 * Draw RLE (Run-Length Encoding) table pages
 */
function drawRLEPages(
  doc: jsPDF,
  pattern: BeadPattern,
  mappings: ColorLetterMapping[],
  dims: PageDimensions,
  options: PDFExportOptions,
  startPage: number
): number {
  // Generate RLE data
  const rleData: { letter: string; count: number; color: BeadColor }[] = [];
  let currentColorIndex = -1;
  let currentCount = 0;

  for (let i = 0; i < pattern.field.length; i++) {
    const colorIndex = pattern.field[i];

    if (colorIndex === currentColorIndex) {
      currentCount++;
    } else {
      if (currentCount > 0) {
        const mapping = mappings.find(m => m.colorIndex === currentColorIndex);
        if (mapping) {
          rleData.push({
            letter: mapping.letter,
            count: currentCount,
            color: mapping.color,
          });
        }
      }
      currentColorIndex = colorIndex;
      currentCount = 1;
    }
  }

  // Don't forget the last run
  if (currentCount > 0) {
    const mapping = mappings.find(m => m.colorIndex === currentColorIndex);
    if (mapping) {
      rleData.push({
        letter: mapping.letter,
        count: currentCount,
        color: mapping.color,
      });
    }
  }

  // Calculate layout
  const cellWidth = 12;
  const cellHeight = 8;
  const colsPerRow = Math.floor(dims.contentWidth / cellWidth);
  const rowsPerPage = Math.floor((dims.contentHeight - 15) / cellHeight);
  const itemsPerPage = colsPerRow * rowsPerPage;

  let currentPage = startPage;
  let itemStart = 0;

  while (itemStart < rleData.length) {
    doc.addPage(dims.orientation === 'landscape' ? 'landscape' : 'portrait');

    // Page header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${pattern.name} - Color Sequence`, MARGINS.left, MARGINS.top + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Numbers show consecutive beads of each color', MARGINS.left, MARGINS.top + 11);

    let y = MARGINS.top + 18;
    let col = 0;

    const itemEnd = Math.min(itemStart + itemsPerPage, rleData.length);

    for (let i = itemStart; i < itemEnd; i++) {
      const item = rleData[i];
      const x = MARGINS.left + (col * cellWidth);

      // Color cell
      if (options.printMode === 'fullColor') {
        doc.setFillColor(item.color.r, item.color.g, item.color.b);
        doc.rect(x, y, cellWidth - 1, cellHeight - 1, 'F');
      }
      doc.setDrawColor(180, 180, 180);
      doc.rect(x, y, cellWidth - 1, cellHeight - 1, 'S');

      // Count number
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');

      if (options.printMode === 'fullColor') {
        const textColor = getContrastingTextColor(item.color);
        doc.setTextColor(textColor === 'white' ? 255 : 0);
      } else {
        doc.setTextColor(0);
      }

      doc.text(`${item.count}`, x + (cellWidth - 1) / 2, y + (cellHeight - 1) / 2 + 1, { align: 'center' });
      doc.setTextColor(0);

      col++;
      if (col >= colsPerRow) {
        col = 0;
        y += cellHeight;
      }
    }

    // Page footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Page ${currentPage}`, dims.width / 2, dims.height - MARGINS.bottom + 5, { align: 'center' });
    doc.setTextColor(0);

    itemStart = itemEnd;
    currentPage++;
  }

  return currentPage;
}

/**
 * Main PDF generation function
 */
export async function generatePatternPDF(
  pattern: BeadPattern,
  userOptions: Partial<PDFExportOptions> = {}
): Promise<Blob> {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  // Create color letter mappings
  const mappings = createColorLetterMappings(pattern.colors, pattern.field);

  // Calculate page dimensions
  const dims = calculatePageDimensions(pattern, options);

  // Create PDF document
  const doc = new jsPDF({
    orientation: dims.orientation,
    unit: 'mm',
    format: options.paperSize,
  });

  let currentPage = 1;

  // Title page
  if (options.includeTitlePage) {
    drawTitlePage(doc, pattern, mappings, dims, options);
    currentPage++;
  }

  // Grid pages
  if (options.includeGrid) {
    if (currentPage > 1) {
      doc.addPage(dims.orientation === 'landscape' ? 'landscape' : 'portrait');
    }
    currentPage = drawGridPages(doc, pattern, mappings, dims, options, currentPage);
  }

  // RLE pages
  if (options.includeRLE) {
    currentPage = drawRLEPages(doc, pattern, mappings, dims, options, currentPage);
  }

  // Return as Blob
  return doc.output('blob');
}

/**
 * Generate and download PDF
 */
export async function downloadPatternPDF(
  pattern: BeadPattern,
  options: Partial<PDFExportOptions> = {}
): Promise<void> {
  const blob = await generatePatternPDF(pattern, options);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${pattern.name || 'pattern'}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get estimated page count
 */
export function estimatePageCount(
  pattern: BeadPattern,
  options: Partial<PDFExportOptions> = {}
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dims = calculatePageDimensions(pattern, opts);

  let pages = 0;

  // Title page
  if (opts.includeTitlePage) pages++;

  // Grid pages
  if (opts.includeGrid) {
    const headerHeight = 10;
    const availableHeight = dims.contentHeight - headerHeight;
    const rowsPerPage = Math.floor(availableHeight / opts.cellSize);
    pages += Math.ceil(pattern.height / rowsPerPage);
  }

  // RLE pages (rough estimate)
  if (opts.includeRLE) {
    const estimatedRuns = pattern.width * pattern.height / 3; // Rough estimate
    const itemsPerPage = 200; // Rough estimate
    pages += Math.ceil(estimatedRuns / itemsPerPage);
  }

  return Math.max(1, pages);
}
