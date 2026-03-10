import { ReactNode } from 'react';

interface PDFPageWrapperProps {
  children: ReactNode;
  title?: string;
  continuation?: boolean;
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isMobile?: boolean;
}

export function PDFPageWrapper({ 
  children, 
  title, 
  continuation = false,
  backgroundColor = '#f8f9fa',
  primaryColor = '#1e3a5f',
  secondaryColor = '#d4c4a8',
  isMobile = false
}: PDFPageWrapperProps) {
  return (
    <div className={`${isMobile ? 'pdf-page-mobile' : 'pdf-page'} mb-8 print:mb-0`} style={{ backgroundColor }}>
      {title && (
        <h2 
          className="font-serif font-bold border-b"
          style={{ 
            marginBottom: '16px', 
            paddingBottom: '10px', 
            fontSize: '18px',
            borderColor: secondaryColor,
            color: primaryColor
          }}
        >
          {title}{continuation ? ' (continuación)' : ''}
        </h2>
      )}
      {children}
    </div>
  );
}
