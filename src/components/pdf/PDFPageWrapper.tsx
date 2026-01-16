import { ReactNode } from 'react';

interface PDFPageWrapperProps {
  children: ReactNode;
  title?: string;
  continuation?: boolean;
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function PDFPageWrapper({ 
  children, 
  title, 
  continuation = false,
  backgroundColor = '#f8f9fa',
  primaryColor = '#1e3a5f',
  secondaryColor = '#d4c4a8'
}: PDFPageWrapperProps) {
  return (
    <div className="pdf-page" style={{ backgroundColor }}>
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
