import { Quote, Template } from '@/types/quote';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { PDFPageWrapper } from './PDFPageWrapper';
import { ReactNode } from 'react';

interface PDFItineraryPagesProps {
  quote: Quote;
  template: Template;
  isMobile?: boolean;
}

// Height estimates for pagination (realistic values)
const HEIGHTS = {
  PAGE_MAX: 900, // Realistic max for A4 content area
  HEADER: 50,
  DAY_BASE: 100, // Base height for a day
  ACTIVITY: 22, // Height per activity
  SUMMARY: 80,
};

interface Section {
  id: string;
  height: number;
  component: ReactNode;
  isFixed?: boolean;
}

export function PDFItineraryPages({ quote, template, isMobile = false }: PDFItineraryPagesProps) {
  // Parse dates correctly - use parseISO for YYYY-MM-DD format to avoid timezone issues
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      return format(date, "EEEE d 'de' MMMM", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Template colors
  const primaryColor = template.colors.primary;
  const secondaryColor = template.colors.secondary;
  const accentColor = template.colors.accent;
  const bgColor = template.colors.background || '#ffffff';
  const cardBgColor = template.colors.cardBackground || '#f8f9fa';

  if (!template.sectionsToggles.itinerary || quote.itineraryDays.length === 0) {
    return null;
  }

  // Build sections (each day is a section)
  const buildSections = (): Section[] => {
    const sections: Section[] = [];

    quote.itineraryDays.forEach((day, index) => {
      const activityCount = day.activities?.length || 0;
      const height = HEIGHTS.DAY_BASE + (activityCount * HEIGHTS.ACTIVITY);

      sections.push({
        id: `day-${day.id}`,
        height,
        component: (
          <div className="relative flex" style={{ gap: '12px', marginBottom: '12px' }}>
            {/* Timeline dot */}
            <div 
              className="relative flex items-center justify-center rounded-full text-white flex-shrink-0"
              style={{ 
                zIndex: 10,
                width: '30px', 
                height: '30px',
                backgroundColor: primaryColor,
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
                className="rounded-lg border"
                style={{ 
                  padding: '10px',
                  backgroundColor: bgColor,
                  borderColor: secondaryColor
                }}
              >
                {day.date && (
                  <div 
                    className="flex items-center"
                    style={{ marginBottom: '4px', gap: '4px', fontSize: '10px', color: `${primaryColor}99` }}
                  >
                    <Calendar style={{ width: '10px', height: '10px' }} />
                    {formatDate(day.date)}
                  </div>
                )}

                <h3 
                  className="font-serif font-semibold"
                  style={{ fontSize: '13px', color: primaryColor }}
                >
                  {day.title}
                </h3>

                <p style={{ marginTop: '4px', fontSize: '11px', color: `${primaryColor}99` }}>
                  {day.description}
                </p>

                {day.activities && day.activities.length > 0 && (
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
                            color: accentColor,
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
        )
      });
    });

    // Summary section (fixed at end)
    sections.push({
      id: 'summary',
      height: HEIGHTS.SUMMARY,
      isFixed: true,
      component: (
        <div 
          className="rounded-lg text-center"
          style={{ 
            marginTop: '20px', 
            padding: '12px',
            background: `linear-gradient(to right, ${secondaryColor}80, ${accentColor}33)`,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <p style={{ fontSize: '12px', color: primaryColor }}>
            <span className="font-semibold">{quote.itineraryDays.length} días</span> de aventura 
            en <span className="font-semibold">{quote.trip.destination}</span>
          </p>
        </div>
      )
    });

    return sections;
  };

  // Group sections into pages
  const groupSectionsIntoPages = (sections: Section[]): Section[][] => {
    const fixedSections = sections.filter(s => s.isFixed);
    const regularSections = sections.filter(s => !s.isFixed);
    
    const fixedHeight = fixedSections.reduce((acc, s) => acc + s.height, 0);
    
    const pages: Section[][] = [];
    let currentPage: Section[] = [];
    let currentHeight = HEIGHTS.HEADER;

    for (let i = 0; i < regularSections.length; i++) {
      const section = regularSections[i];
      const isLast = i === regularSections.length - 1;
      const maxHeight = isLast ? HEIGHTS.PAGE_MAX - fixedHeight : HEIGHTS.PAGE_MAX;

      if (currentHeight + section.height > maxHeight) {
        if (currentPage.length > 0) {
          pages.push(currentPage);
        }
        currentPage = [section];
        currentHeight = HEIGHTS.HEADER + section.height;
      } else {
        currentPage.push(section);
        currentHeight += section.height;
      }
    }

    // Add fixed sections to the last page
    if (currentPage.length > 0 || fixedSections.length > 0) {
      currentPage.push(...fixedSections);
      pages.push(currentPage);
    }

    return pages;
  };

  const sections = buildSections();
  const pages = groupSectionsIntoPages(sections);

  // Timeline line component
  const TimelineLine = () => (
    <div 
      className="absolute"
      style={{ 
        left: '14px', 
        top: '0', 
        height: '100%', 
        width: '2px',
        background: `linear-gradient(to bottom, ${primaryColor}, ${accentColor}, ${primaryColor}4d)`,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }} 
    />
  );

  return (
    <>
      {pages.map((pageSections, pageIndex) => (
        <PDFPageWrapper
          key={`itinerary-page-${pageIndex}`}
          title="Itinerario día a día"
          continuation={pageIndex > 0}
          backgroundColor={cardBgColor}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          isMobile={isMobile}
          headingStyle={template.styles.headingStyle}
          accentColor={template.colors.accent}
          contentDensity={template.styles.contentDensity}
        >
          <div className="relative">
            <TimelineLine />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pageSections.filter(s => !s.isFixed).map((section) => (
                <div key={section.id}>{section.component}</div>
              ))}
            </div>
          </div>
          {pageSections.filter(s => s.isFixed).map((section) => (
            <div key={section.id}>{section.component}</div>
          ))}
        </PDFPageWrapper>
      ))}
    </>
  );
}
