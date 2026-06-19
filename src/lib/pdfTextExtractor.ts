// Client-side PDF text extraction using pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist';

// Use the official CDN matching the installed pdfjs-dist version (3.11.174)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
}

export interface PdfExtractionResult {
  text: string;
  items: PdfTextItem[];
}

async function extractPdfPages(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ lines: { y: number; items: { x: number; text: string }[] }[] }[]> {
  onProgress?.('Leyendo PDF...');
  const arrayBuffer = await file.arrayBuffer();

  const header = new Uint8Array(arrayBuffer.slice(0, 5));
  const headerStr = String.fromCharCode(...header);
  if (!headerStr.startsWith('%PDF-')) {
    throw new Error('El archivo no es un PDF válido');
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: { lines: { y: number; items: { x: number; text: string }[] }[] }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Extrayendo página ${i} de ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const items = content.items
      .filter((item: any) => 'str' in item && item.str.trim() !== '')
      .map((item: any) => ({
        text: item.str,
        x: item.transform[4],
        y: Math.round(item.transform[5] * 10) / 10,
      }));

    const lines: { y: number; items: { x: number; text: string }[] }[] = [];
    const Y_TOLERANCE = 2;

    for (const item of items) {
      let existingLine = lines.find(l => Math.abs(l.y - item.y) < Y_TOLERANCE);
      if (existingLine) {
        existingLine.items.push({ x: item.x, text: item.text });
      } else {
        lines.push({ y: item.y, items: [{ x: item.x, text: item.text }] });
      }
    }

    lines.sort((a, b) => b.y - a.y);
    pages.push({ lines });
  }

  return pages;
}

function reconstructText(pages: { lines: { y: number; items: { x: number; text: string }[] }[] }[]): string {
  let fullText = '';
  for (const page of pages) {
    const pageText = page.lines.map(line => {
      line.items.sort((a, b) => a.x - b.x);
      let lineText = '';
      for (let j = 0; j < line.items.length; j++) {
        if (j > 0) {
          const gap = line.items[j].x - (line.items[j - 1].x + line.items[j - 1].text.length * 3.5);
          lineText += gap > 10 ? '  ' : ' ';
        }
        lineText += line.items[j].text;
      }
      return lineText;
    }).join('\n');
    fullText += pageText + '\n\n';
  }
  return fullText.trim();
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  const pages = await extractPdfPages(file, onProgress);
  return reconstructText(pages);
}

/**
 * Extract text AND positioned items from PDF.
 * The items array preserves X/Y positions for each text fragment,
 * enabling column-aware parsing (e.g., Pesos vs Dolares columns).
 */
export async function extractTextWithPositionsFromPDF(
  file: File,
  onProgress?: (msg: string) => void
): Promise<PdfExtractionResult> {
  const pages = await extractPdfPages(file, onProgress);
  const text = reconstructText(pages);

  // Flatten all items across all pages
  const items: PdfTextItem[] = [];
  for (const page of pages) {
    for (const line of page.lines) {
      for (const item of line.items) {
        items.push({ text: item.text, x: item.x, y: line.y });
      }
    }
  }

  return { text, items };
}
