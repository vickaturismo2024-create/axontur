import { Quote, Template } from '@/types/quote';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CheckCircle2, ChevronRight, Star, Circle } from 'lucide-react';
import { PDFPageWrapper } from './PDFPageWrapper';
import { ReactNode } from 'react';

interface PDFItineraryPagesProps {
  quote: Quote;
  template: Template;
  isMobile?: boolean;
}

const HEIGHTS = {
  PAGE_MAX: 900,
  HEADER: 50,
  DAY_BASE: 100,
  ACTIVITY: 22,
  SUMMARY: 80,
};

interface Section {
  id: string;
  height: number;
  component: ReactNode;
  isFixed?: boolean;
}

export function PDFItineraryPages({ quote, template, isMobile = false }: PDFItineraryPagesProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      const df = template.styles.dateFormat || 'long';
      if (df === 'short') return format(date, "dd/MM/yyyy");
      if (df === 'medium') return format(date, "d MMM yyyy", { locale: es });
      return format(date, "EEEE d 'de' MMMM", { locale: es });
    } catch { return dateString; }
  };

  const primaryColor = template.colors.primary;
  const secondaryColor = template.colors.secondary;
  const accentColor = template.colors.accent;
  const bgColor = template.colors.background || '#ffffff';
  const cardBgColor = template.colors.cardBackground || '#f8f9fa';

  const layout = template.styles.itineraryLayout || 'timeline';
  const dotStyle = template.styles.itineraryDotStyle || 'numbered';
  const cardStyle = template.styles.itineraryCardStyle || 'bordered';
  const summaryStyle = template.styles.itinerarySummaryStyle || 'gradient-banner';
  const showDayDate = template.styles.itineraryShowDayDate !== false;
  const activityIcon = template.styles.itineraryActivityIcon || 'checkmark';

  if (!template.sectionsToggles.itinerary || quote.itineraryDays.length === 0) return null;

  // Activity icon renderer
  const ActivityIcon = () => {
    const style = { width: '12px', height: '12px', color: accentColor, flexShrink: 0, marginTop: '1px', WebkitPrintColorAdjust: 'exact' as const, printColorAdjust: 'exact' as const };
    switch (activityIcon) {
      case 'bullet': return <Circle style={{ ...style, fill: accentColor }} />;
      case 'arrow': return <ChevronRight style={style} />;
      case 'star': return <Star style={{ ...style, fill: accentColor }} />;
      case 'checkmark':
      default: return <CheckCircle2 style={style} />;
    }
  };

  // Day dot/marker renderer
  const DayMarker = ({ dayNumber }: { dayNumber: number }) => {
    const base: React.CSSProperties = {
      zIndex: 10, width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', flexShrink: 0, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
    };
    switch (dotStyle) {
      case 'icon':
        return <div style={{ ...base, backgroundColor: `${primaryColor}1a` }}><Calendar style={{ width: '14px', height: '14px', color: primaryColor }} /></div>;
      case 'filled':
        return <div style={{ ...base, backgroundColor: primaryColor, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}><span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>●</span></div>;
      case 'ring':
        return <div style={{ ...base, border: `3px solid ${primaryColor}`, backgroundColor: bgColor }}><span className="font-serif font-bold" style={{ fontSize: '11px', color: primaryColor }}>{dayNumber}</span></div>;
      case 'numbered':
      default:
        return <div className="text-white" style={{ ...base, backgroundColor: primaryColor, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}><span className="font-serif font-bold" style={{ fontSize: '11px' }}>{dayNumber}</span></div>;
    }
  };

  // Card style for day content
  const getDayCardStyle = (): React.CSSProperties => {
    switch (cardStyle) {
      case 'filled':
        return { padding: '10px', backgroundColor: cardBgColor, borderRadius: '8px' };
      case 'minimal':
        return { padding: '10px 0', borderBottom: `1px solid ${secondaryColor}40` };
      case 'accent-top':
        return { padding: '10px', backgroundColor: bgColor, borderRadius: '8px', borderTop: `3px solid ${accentColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
      case 'bordered':
      default:
        return { padding: '10px', backgroundColor: bgColor, borderRadius: '8px', border: `1px solid ${secondaryColor}` };
    }
  };

  // Day content (shared across layouts)
  const DayContent = ({ day }: { day: typeof quote.itineraryDays[0] }) => (
    <div style={getDayCardStyle()}>
      {showDayDate && day.date && (
        <div className="flex items-center" style={{ marginBottom: '4px', gap: '4px', fontSize: '10px', color: `${primaryColor}99` }}>
          <Calendar style={{ width: '10px', height: '10px' }} />
          {formatDate(day.date)}
        </div>
      )}
      <h3 className="font-serif font-semibold" style={{ fontSize: '13px', color: primaryColor }}>{day.title}</h3>
      <p style={{ marginTop: '4px', fontSize: '11px', color: `${primaryColor}99` }}>{day.description}</p>
      {day.activities && day.activities.length > 0 && (
        <ul style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {day.activities.map((activity, actIdx) => (
            <li key={actIdx} className="flex items-start" style={{ gap: '6px', fontSize: '10px' }}>
              <ActivityIcon />
              <span>{activity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Summary component
  const SummarySection = () => {
    if (summaryStyle === 'none') return null;
    const text = (
      <>
        <span className="font-semibold">{quote.itineraryDays.length} días</span> de aventura en{' '}
        <span className="font-semibold">{quote.trip.destination}</span>
      </>
    );
    switch (summaryStyle) {
      case 'card':
        return (
          <div className="rounded-lg border text-center" style={{ marginTop: '20px', padding: '12px', borderColor: secondaryColor, backgroundColor: bgColor }}>
            <p style={{ fontSize: '12px', color: primaryColor }}>{text}</p>
          </div>
        );
      case 'simple-text':
        return (
          <p className="text-center" style={{ marginTop: '20px', fontSize: '12px', color: `${primaryColor}80` }}>{text}</p>
        );
      case 'gradient-banner':
      default:
        return (
          <div className="rounded-lg text-center" style={{ marginTop: '20px', padding: '12px', background: `linear-gradient(to right, ${secondaryColor}80, ${accentColor}33)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <p style={{ fontSize: '12px', color: primaryColor }}>{text}</p>
          </div>
        );
    }
  };

  // Build sections based on layout
  const buildSections = (): Section[] => {
    const sections: Section[] = [];

    if (layout === 'cards') {
      // Cards layout: each day in an independent card, 2 columns when possible
      const pairs: (typeof quote.itineraryDays[number])[][] = [];
      for (let i = 0; i < quote.itineraryDays.length; i += 2) {
        pairs.push(quote.itineraryDays.slice(i, i + 2));
      }
      pairs.forEach((pair, pairIdx) => {
        const maxActivities = Math.max(...pair.map(d => d.activities?.length || 0));
        sections.push({
          id: `pair-${pairIdx}`,
          height: HEIGHTS.DAY_BASE + (maxActivities * HEIGHTS.ACTIVITY) + 20,
          component: (
            <div style={{ display: 'grid', gridTemplateColumns: pair.length > 1 ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '10px' }}>
              {pair.map((day) => (
                <div key={day.id}>
                  <div className="flex items-center" style={{ gap: '8px', marginBottom: '6px' }}>
                    <DayMarker dayNumber={day.dayNumber} />
                    <span className="font-serif font-semibold" style={{ fontSize: '12px', color: primaryColor }}>Día {day.dayNumber}</span>
                  </div>
                  <DayContent day={day} />
                </div>
              ))}
            </div>
          ),
        });
      });
    } else if (layout === 'compact') {
      // Compact: all days in a tight list
      quote.itineraryDays.forEach((day) => {
        const activityCount = day.activities?.length || 0;
        sections.push({
          id: `day-${day.id}`,
          height: 50 + (activityCount * 18),
          component: (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', paddingBottom: '6px', borderBottom: `1px solid ${secondaryColor}30` }}>
              <div style={{ minWidth: '50px', textAlign: 'center' }}>
                <div className="font-serif font-bold" style={{ fontSize: '20px', color: primaryColor, lineHeight: 1 }}>{day.dayNumber}</div>
                {showDayDate && day.date && (
                  <p style={{ fontSize: '8px', color: `${primaryColor}70`, marginTop: '2px' }}>{formatDate(day.date).split(' ').slice(0, 2).join(' ')}</p>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="font-serif font-semibold" style={{ fontSize: '12px', color: primaryColor }}>{day.title}</h3>
                {day.description && <p style={{ fontSize: '10px', color: `${primaryColor}80`, marginTop: '2px' }}>{day.description}</p>}
                {day.activities && day.activities.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {day.activities.map((a, i) => (
                      <span key={i} style={{ fontSize: '9px', padding: '1px 6px', backgroundColor: `${primaryColor}0d`, borderRadius: '4px', color: primaryColor }}>{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        });
      });
    } else if (layout === 'magazine') {
      // Magazine: editorial style with large blocks, alternating accent backgrounds
      quote.itineraryDays.forEach((day, index) => {
        const activityCount = day.activities?.length || 0;
        const isAccent = index % 2 === 0;
        sections.push({
          id: `day-${day.id}`,
          height: HEIGHTS.DAY_BASE + (activityCount * HEIGHTS.ACTIVITY) + 30,
          component: (
            <div 
              style={{ 
                marginBottom: '14px', 
                padding: '16px', 
                borderRadius: '10px',
                backgroundColor: isAccent ? `${primaryColor}08` : bgColor,
                borderLeft: `4px solid ${isAccent ? accentColor : primaryColor}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <div>
                  <span className="font-serif font-bold" style={{ fontSize: '22px', color: primaryColor }}>Día {day.dayNumber}</span>
                  {showDayDate && day.date && (
                    <span style={{ marginLeft: '10px', fontSize: '11px', color: `${primaryColor}70` }}>{formatDate(day.date)}</span>
                  )}
                </div>
              </div>
              <h3 className="font-serif font-semibold" style={{ fontSize: '15px', color: primaryColor, marginBottom: '6px' }}>{day.title}</h3>
              <p style={{ fontSize: '11px', color: `${primaryColor}90`, lineHeight: '1.6' }}>{day.description}</p>
              {day.activities && day.activities.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${secondaryColor}40` }}>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {day.activities.map((activity, actIdx) => (
                      <li key={actIdx} className="flex items-start" style={{ gap: '6px', fontSize: '11px' }}>
                        <ActivityIcon />
                        <span style={{ color: `${primaryColor}cc` }}>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
        });
      });
    } else {
      // Timeline (default)
      quote.itineraryDays.forEach((day) => {
        const activityCount = day.activities?.length || 0;
        sections.push({
          id: `day-${day.id}`,
          height: HEIGHTS.DAY_BASE + (activityCount * HEIGHTS.ACTIVITY),
          component: (
            <div className="relative flex" style={{ gap: '12px', marginBottom: '12px' }}>
              <DayMarker dayNumber={day.dayNumber} />
              <div className="flex-1" style={{ paddingBottom: '4px' }}>
                <DayContent day={day} />
              </div>
            </div>
          ),
        });
      });
    }

    // Summary
    if (summaryStyle !== 'none') {
      sections.push({
        id: 'summary',
        height: HEIGHTS.SUMMARY,
        isFixed: true,
        component: <SummarySection />,
      });
    }

    return sections;
  };

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
        if (currentPage.length > 0) pages.push(currentPage);
        currentPage = [section];
        currentHeight = HEIGHTS.HEADER + section.height;
      } else {
        currentPage.push(section);
        currentHeight += section.height;
      }
    }

    if (currentPage.length > 0 || fixedSections.length > 0) {
      currentPage.push(...fixedSections);
      pages.push(currentPage);
    }

    return pages;
  };

  const sections = buildSections();
  const pages = groupSectionsIntoPages(sections);

  const TimelineLine = () => (
    <div className="absolute" style={{ left: '14px', top: '0', height: '100%', width: '2px', background: `linear-gradient(to bottom, ${primaryColor}, ${accentColor}, ${primaryColor}4d)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
  );

  const useTimeline = layout === 'timeline';

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
          {useTimeline ? (
            <div className="relative">
              <TimelineLine />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pageSections.filter(s => !s.isFixed).map((section) => (
                  <div key={section.id}>{section.component}</div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {pageSections.filter(s => !s.isFixed).map((section) => (
                <div key={section.id}>{section.component}</div>
              ))}
            </div>
          )}
          {pageSections.filter(s => s.isFixed).map((section) => (
            <div key={section.id}>{section.component}</div>
          ))}
        </PDFPageWrapper>
      ))}
    </>
  );
}
