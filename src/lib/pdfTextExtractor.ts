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

    // Reconstruct line structure using Y coordinates from transform matrix
    // transform[5] = Y position (higher = closer to top of page)
    // transform[4] = X position (higher = further right)
    const items = content.items
      .filter((item: any) => 'str' in item && item.str.trim() !== '')
      .map((item: any) => ({
        text: item.str,
        x: item.transform[4],
        y: Math.round(item.transform[5] * 10) / 10, // round to 0.1 to group similar Y positions
      }));

    if (items.length === 0) {
      fullText += '\n\n';
      continue;
    }

    // Group by Y coordinate (same line), with tolerance of ~2 units
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

    // Sort lines top-to-bottom (highest Y first), then items left-to-right
    lines.sort((a, b) => b.y - a.y);
    const pageText = lines.map(line => {
      line.items.sort((a, b) => a.x - b.x);
      // Insert spaces between items based on X gap
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
