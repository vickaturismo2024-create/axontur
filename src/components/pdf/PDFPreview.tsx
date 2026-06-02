import { useEffect, useState, useRef } from 'react';
import { Quote, Template } from '@/types/quote';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFDetailsPages } from './PDFDetailsPages';
import { PDFContactPages } from './PDFContactPages';
import { PDFItineraryPages } from './PDFItineraryPages';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PDFPreviewProps {
  quote: Quote;
  template: Template;
}

export function PDFPreview({ quote, template }: PDFPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  const [height, setHeight] = useState<number | string>('auto');

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        // Target page width is 210mm (approx 794px).
        // Leave a small 16px padding on mobile.
        const computedScale = Math.min(1, (width - 8) / 794);
        setScale(computedScale);
        
        if (contentRef.current) {
          // Use scrollHeight which represents the unscaled content height
          const unscaledHeight = contentRef.current.scrollHeight;
          setHeight(unscaledHeight * computedScale);
        }
      }
    };
    
    const observer = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    // Defer measuring slightly so the DOM updates first
    const timer = setTimeout(handleResize, 150);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [quote, template]);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <ScrollArea className="h-[calc(100vh-200px)] w-full">
        <div className="flex justify-center p-1 w-full">
          <div 
            style={{ 
              width: `${794 * scale}px`,
              height: typeof height === 'number' ? `${height}px` : height,
              position: 'relative',
              overflow: 'hidden',
            }}
            className="transition-all duration-150 ease-out"
          >
            <div 
              ref={contentRef}
              style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'top left',
                width: '794px',
                position: 'absolute',
                left: 0,
                top: 0,
              }}
              className="flex flex-col items-center gap-8"
            >
              {/* Página 1: Portada */}
              <div className="mb-8 w-full flex justify-center">
                <PDFCoverPage quote={quote} template={template} />
              </div>

              {/* Páginas de Detalles */}
              <PDFDetailsPages quote={quote} template={template} />

              {/* Páginas de Contacto */}
              <PDFContactPages quote={quote} template={template} />

              {/* Páginas de Itinerario */}
              {template.sectionsToggles.itinerary && quote.itineraryDays.length > 0 && (
                <PDFItineraryPages quote={quote} template={template} />
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
