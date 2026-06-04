// Client-side PDF text extraction using pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist';

// Use the official CDN matching the installed pdfjs-dist version (3.11.174)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

export async function extractTextFromPDF(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Leyendo PDF...');
  const arrayBuffer = await file.arrayBuffer();

  // Validate PDF header
  const header = new Uint8Array(arrayBuffer.slice(0, 5));
  const headerStr = String.fromCharCode(...header);
  if (!headerStr.startsWith('%PDF-')) {
    throw new Error('El archivo no es un PDF válido');
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Extrayendo página ${i} de ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}
