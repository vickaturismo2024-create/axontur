import { ReactNode } from 'react';

interface PDFPageWrapperProps {
  children: ReactNode;
  title?: string;
  continuation?: boolean;
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isMobile?: boolean;
  headingStyle?: 'underline' | 'background' | 'accent-left' | 'pill';
  accentColor?: string;
  contentDensity?: 'compact' | 'normal' | 'spacious';
}

export function PDFPageWrapper({ 
  children, 
  title, 
  continuation = false,
  backgroundColor = '#f8f9fa',
  primaryColor = '#1e3a5f',
  secondaryColor = '#d4c4a8',
  isMobile = false,
  headingStyle = 'underline',
  accentColor,
  contentDensity = 'normal',
}: PDFPageWrapperProps) {
  const accent = accentColor || secondaryColor;
  const padding = contentDensity === 'compact' ? '12px' : contentDensity === 'spacious' ? '24px' : '16px';

  const renderTitle = () => {
    if (!title) return null;
    const text = `${title}${continuation ? ' (continuación)' : ''}`;

    switch (headingStyle) {
      case 'background':
        return (
          <h2 className="font-serif font-bold" style={{ marginBottom: padding, padding: '8px 14px', fontSize: '18px', color: '#ffffff', backgroundColor: primaryColor, borderRadius: '4px' }}>
            {text}
          </h2>
        );
      case 'accent-left':
        return (
          <h2 className="font-serif font-bold" style={{ marginBottom: padding, paddingLeft: '14px', paddingBottom: '10px', fontSize: '18px', color: primaryColor, borderLeft: `4px solid ${accent}` }}>
            {text}
          </h2>
        );
      case 'pill':
        return (
          <h2 className="font-serif font-bold" style={{ marginBottom: padding, padding: '6px 20px', fontSize: '18px', color: primaryColor, backgroundColor: `${primaryColor}12`, borderRadius: '999px', display: 'inline-block' }}>
            {text}
          </h2>
        );
      case 'underline':
      default:
        return (
          <h2 className="font-serif font-bold border-b" style={{ marginBottom: padding, paddingBottom: '10px', fontSize: '18px', borderColor: secondaryColor, color: primaryColor }}>
            {text}
          </h2>
        );
    }
  };

  return (
    <div className={`${isMobile ? 'pdf-page-mobile' : 'pdf-page'} mb-8 print:mb-0`} style={{ backgroundColor }}>
      {renderTitle()}
      {children}
    </div>
  );
}
