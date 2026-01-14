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
      <h2 className="mb-6 border-b border-border pb-3 font-serif text-2xl font-bold text-foreground">
        Itinerario día a día
      </h2>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 h-full w-0.5 bg-gradient-to-b from-primary via-gold to-primary/30" />

        <div className="space-y-6">
          {quote.itineraryDays.map((day, index) => (
            <div key={day.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <span className="font-serif text-sm font-bold">{day.dayNumber}</span>
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="rounded-lg border border-border bg-white p-4 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {day.date && formatDate(day.date)}
                  </div>

                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    {day.title}
                  </h3>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {day.description}
                  </p>

                  {day.activities.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {day.activities.map((activity, actIdx) => (
                        <li 
                          key={actIdx} 
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
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
      <div className="mt-8 rounded-lg bg-gradient-to-r from-secondary/50 to-gold/20 p-4">
        <p className="text-center text-sm text-foreground">
          <span className="font-semibold">{quote.itineraryDays.length} días</span> de aventura 
          en <span className="font-semibold">{quote.trip.destination}</span>
        </p>
      </div>
    </div>
  );
}
