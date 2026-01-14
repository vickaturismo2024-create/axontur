import { Quote, Template } from '@/types/quote';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface PDFItineraryPageProps {
  quote: Quote;
  template: Template;
}

export function PDFItineraryPage({ quote, template }: PDFItineraryPageProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), "EEEE d 'de' MMMM", { locale: es });
  };

  if (!template.sectionsToggles.itinerary || quote.itineraryDays.length === 0) {
    return null;
  }

  return (
    <div className="pdf-page">
      <h2 
        className="font-serif font-bold border-b"
        style={{ 
          marginBottom: '16px', 
          paddingBottom: '10px', 
          fontSize: '18px',
          borderColor: 'hsl(40 20% 88%)',
          color: 'hsl(215 50% 15%)'
        }}
      >
        Itinerario día a día
      </h2>

      <div className="relative">
        {/* Timeline line */}
        <div 
          className="absolute"
          style={{ 
            left: '14px', 
            top: '0', 
            height: '100%', 
            width: '2px',
            background: 'linear-gradient(to bottom, hsl(215 50% 23%), hsl(38 70% 55%), hsl(215 50% 23% / 0.3))',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }} 
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {quote.itineraryDays.map((day) => (
            <div key={day.id} className="relative flex" style={{ gap: '12px' }}>
              {/* Timeline dot */}
              <div 
                className="relative flex items-center justify-center rounded-full text-white flex-shrink-0"
                style={{ 
                  zIndex: 10,
                  width: '30px', 
                  height: '30px',
                  backgroundColor: 'hsl(215 50% 23%)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                <span className="font-serif font-bold" style={{ fontSize: '11px' }}>{day.dayNumber}</span>
              </div>

              {/* Content */}
              <div className="flex-1" style={{ paddingBottom: '4px' }}>
                <div 
                  className="rounded-lg border bg-white"
                  style={{ 
                    padding: '10px',
                    borderColor: 'hsl(40 20% 88%)'
                  }}
                >
                  {day.date && (
                    <div 
                      className="flex items-center"
                      style={{ marginBottom: '4px', gap: '4px', fontSize: '10px', color: 'hsl(215 20% 45%)' }}
                    >
                      <Calendar style={{ width: '10px', height: '10px' }} />
                      {formatDate(day.date)}
                    </div>
                  )}

                  <h3 
                    className="font-serif font-semibold"
                    style={{ fontSize: '13px', color: 'hsl(215 50% 15%)' }}
                  >
                    {day.title}
                  </h3>

                  <p style={{ marginTop: '4px', fontSize: '11px', color: 'hsl(215 20% 45%)' }}>
                    {day.description}
                  </p>

                  {day.activities.length > 0 && (
                    <ul style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {day.activities.map((activity, actIdx) => (
                        <li 
                          key={actIdx} 
                          className="flex items-start"
                          style={{ gap: '6px', fontSize: '10px' }}
                        >
                          <CheckCircle2 
                            className="flex-shrink-0"
                            style={{ 
                              marginTop: '1px', 
                              width: '12px', 
                              height: '12px', 
                              color: 'hsl(38 70% 55%)',
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact'
                            }} 
                          />
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div 
        className="rounded-lg text-center"
        style={{ 
          marginTop: '20px', 
          padding: '12px',
          background: 'linear-gradient(to right, hsl(38 45% 85% / 0.5), hsl(38 70% 55% / 0.2))',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        <p style={{ fontSize: '12px', color: 'hsl(215 50% 15%)' }}>
          <span className="font-semibold">{quote.itineraryDays.length} días</span> de aventura 
          en <span className="font-semibold">{quote.trip.destination}</span>
        </p>
      </div>
    </div>
  );
}
