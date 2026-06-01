import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TourOverlay() {
  const { isActive, currentStep, currentStepIndex, totalSteps, currentSectionLabel, nextStep, prevStep, endTour, targetRect } = useTour();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isActive]);

  if (!isActive || !visible) return null;

  const pad = 8;
  const hasTarget = targetRect !== null;
  const progressPercent = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  // Tooltip positioning
  const tooltipStyle: React.CSSProperties = hasTarget
    ? {
        position: 'fixed',
        top: targetRect.bottom + pad + 8,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 370)),
        zIndex: 10002,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10002,
      };

  // If tooltip would go below viewport, show above target
  if (hasTarget && targetRect.bottom + pad + 8 + 200 > window.innerHeight) {
    tooltipStyle.top = Math.max(16, targetRect.top - pad - 200);
  }

  // Spotlight mask using box-shadow
  const spotlightStyle: React.CSSProperties = hasTarget
    ? {
        position: 'fixed',
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
        borderRadius: '0.5rem',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
        zIndex: 10001,
        pointerEvents: 'none' as const,
        transition: 'all 0.3s ease',
      }
    : {};

  return (
    <>
      {/* Overlay */}
      {!hasTarget && (
        <div
          className="fixed inset-0 bg-black/55 transition-opacity duration-300"
          style={{ zIndex: 10000 }}
          onClick={endTour}
        />
      )}

      {/* Spotlight cutout */}
      {hasTarget && <div style={spotlightStyle} />}

      {/* Click blocker behind tooltip */}
      {hasTarget && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 10000, cursor: 'default' }}
          onClick={endTour}
        />
      )}

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="w-[350px] rounded-xl border border-border bg-card p-5 shadow-xl animate-fade-in"
      >
        {/* Section label + progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">
              {currentSectionLabel}
            </span>
            <button onClick={endTour} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Paso {currentStepIndex + 1} de {totalSteps}
          </span>
        </div>

        <h4 className="font-sans text-base font-semibold text-foreground mb-1">
          {currentStep?.title}
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          {currentStep?.description}
        </p>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button size="sm" onClick={nextStep} className="gap-1">
            {currentStepIndex === totalSteps - 1 ? 'Finalizar' : 'Siguiente'}
            {currentStepIndex < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
