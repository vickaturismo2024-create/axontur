import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  page: string;
}

export interface TourSection {
  id: string;
  label: string;
  steps: TourStep[];
}

const tourSections: TourSection[] = [
  {
    id: 'general',
    label: 'Editor de presupuestos',
    steps: [
      { selector: '[data-tour="step-tabs"]', title: 'Navegación por pestañas', description: 'Usá estas pestañas para moverte entre las secciones del presupuesto: datos generales, vuelos, alojamiento, precios y más.', page: '/quote/new' },
      { selector: '[data-tour="client-name"]', title: 'Nombre del cliente', description: 'Ingresá el nombre del pasajero o grupo. Aparecerá en la portada del PDF.', page: '/quote/new' },
      { selector: '[data-tour="trip-destination"]', title: 'Destino del viaje', description: 'Escribí el destino principal. Podés poner una ciudad, país o región.', page: '/quote/new' },
      { selector: '[data-tour="save-button"]', title: 'Guardar presupuesto', description: 'Cuando termines de editar, hacé clic acá para guardar todos los cambios.', page: '/quote/new' },
    ],
  },
];

interface TourContextType {
  isActive: boolean;
  currentSectionId: string | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  startTour: (sectionId: string) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  targetRect: DOMRect | null;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const section = tourSections.find(s => s.id === currentSectionId);
  const steps = section?.steps ?? [];
  const currentStep = steps[currentStepIndex] ?? null;

  const updateRect = useCallback(() => {
    if (!currentStep) { setTargetRect(null); return; }
    const el = document.querySelector(currentStep.selector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Observe target element for rect changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Small delay to let the page render after navigation
    const timeout = setTimeout(() => {
      updateRect();
      const el = document.querySelector(currentStep.selector);
      if (el) {
        observerRef.current = new ResizeObserver(updateRect);
        observerRef.current.observe(el);
      }
    }, 400);

    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      clearTimeout(timeout);
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [isActive, currentStep, updateRect, location.pathname]);

  const startTour = useCallback((sectionId: string) => {
    const sec = tourSections.find(s => s.id === sectionId);
    if (!sec || sec.steps.length === 0) return;
    setCurrentSectionId(sectionId);
    setCurrentStepIndex(0);
    setIsActive(true);
    if (sec.steps[0].page !== location.pathname) {
      navigate(sec.steps[0].page);
    }
  }, [navigate, location.pathname]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentSectionId(null);
    setCurrentStepIndex(0);
    setTargetRect(null);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const nextS = steps[nextIdx];
      if (nextS && nextS.page !== location.pathname) {
        navigate(nextS.page);
      }
    } else {
      endTour();
    }
  }, [currentStepIndex, steps, endTour, navigate, location.pathname]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      const prevS = steps[prevIdx];
      if (prevS && prevS.page !== location.pathname) {
        navigate(prevS.page);
      }
    }
  }, [currentStepIndex, steps, navigate, location.pathname]);

  return (
    <TourContext.Provider value={{ isActive, currentSectionId, currentStepIndex, currentStep, totalSteps: steps.length, startTour, endTour, nextStep, prevStep, targetRect }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
