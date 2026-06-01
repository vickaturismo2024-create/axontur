import { Plane } from 'lucide-react';

interface PageLoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function PageLoadingScreen({ message = 'Cargando datos...', fullScreen = false }: PageLoadingScreenProps) {
  const containerClass = fullScreen 
    ? 'fixed inset-0 z-[100] bg-background/95 backdrop-blur-md' 
    : 'w-full py-16 flex flex-col items-center justify-center bg-transparent';

  return (
    <div className={`${containerClass} flex flex-col items-center justify-center animate-fadeIn transition-all duration-300`}>
      <div className="relative flex flex-col items-center gap-4">
        {/* Spinner Ring and Icon */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
          <Plane className="h-6 w-6 text-primary animate-pulse" />
        </div>
        
        {/* Loading text message */}
        <div className="text-center px-4">
          {fullScreen && (
            <h3 className="font-sans text-sm font-bold text-foreground tracking-widest uppercase mb-1">
              AxonTur
            </h3>
          )}
          <p className="text-xs text-muted-foreground uppercase tracking-wider animate-pulse font-medium">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
