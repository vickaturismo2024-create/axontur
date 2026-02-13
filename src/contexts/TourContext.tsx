import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  page: string;
  tabIndex?: number;
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
      { selector: '[data-tour="client-name"]', title: 'Nombre del cliente', description: 'Ingresá el nombre del pasajero o grupo. Aparecerá en la portada del PDF.', page: '/quote/new', tabIndex: 1 },
      { selector: '[data-tour="trip-destination"]', title: 'Destino del viaje', description: 'Escribí el destino principal. Podés poner una ciudad, país o región.', page: '/quote/new', tabIndex: 1 },
      { selector: '[data-tour="save-button"]', title: 'Guardar presupuesto', description: 'Cuando termines de editar, hacé clic acá para guardar todos los cambios.', page: '/quote/new' },
    ],
  },
  {
    id: 'flights',
    label: 'Vuelos',
    steps: [
      { selector: '[data-tour="step-tabs"]', title: 'Pestaña de vuelos', description: 'Navegá hasta la pestaña "Vuelos" para gestionar los tramos aéreos del presupuesto.', page: '/quote/new', tabIndex: 3 },
      { selector: '[data-tour="add-flight"]', title: 'Agregar vuelo', description: 'Hacé clic aquí para agregar un nuevo tramo de vuelo. Podés agregar todos los que necesites.', page: '/quote/new', tabIndex: 3 },
      { selector: '[data-tour="add-flight-option"]', title: 'Agregar opción alternativa', description: 'Podés ofrecer varias opciones de vuelo al cliente. Cada opción se muestra como una tarjeta separada en el PDF.', page: '/quote/new', tabIndex: 3 },
      { selector: '[data-tour="pnr-parser"]', title: 'Importar desde PNR', description: 'Si tenés un código de reserva (PNR), podés importar los vuelos automáticamente sin cargarlos a mano.', page: '/quote/new', tabIndex: 3 },
      { selector: '[data-tour="flight-instructions"]', title: 'Consejo de vuelos', description: 'Recordá que podés vincular tramos como ida y vuelta o escalas. El sistema los agrupará automáticamente.', page: '/quote/new', tabIndex: 3 },
    ],
  },
  {
    id: 'lodging',
    label: 'Alojamiento',
    steps: [
      { selector: '[data-tour="step-tabs"]', title: 'Pestaña de alojamiento', description: 'Navegá a la pestaña "Alojamiento" para gestionar los hoteles del presupuesto.', page: '/quote/new', tabIndex: 4 },
      { selector: '[data-tour="add-lodging"]', title: 'Agregar alojamiento', description: 'Agregá un hotel completando nombre, ubicación, fechas de check-in/check-out y categoría.', page: '/quote/new', tabIndex: 4 },
      { selector: '[data-tour="add-lodging-option"]', title: 'Agregar opción alternativa', description: 'Ofrecé varias alternativas de hotel para que el cliente elija. Cada opción puede tener su propio precio.', page: '/quote/new', tabIndex: 4 },
      { selector: '[data-tour="lodging-instructions"]', title: 'Precio por noche vs total', description: 'Podés elegir entre cargar el precio por noche (se calcula el total automáticamente) o directamente el total de la estadía.', page: '/quote/new', tabIndex: 4 },
    ],
  },
  {
    id: 'pricing',
    label: 'Precios',
    steps: [
      { selector: '[data-tour="step-tabs"]', title: 'Pestaña de precios', description: 'Navegá a la pestaña "Precio" para configurar los costos y precios de venta del presupuesto.', page: '/quote/new', tabIndex: 9 },
      { selector: '[data-tour="pricing-mode"]', title: 'Modo de cálculo', description: 'Elegí entre modo automático (el sistema calcula con margen) o manual (vos ingresás el precio final).', page: '/quote/new', tabIndex: 9 },
      { selector: '[data-tour="pricing-section"]', title: 'Desglose de precios', description: 'Acá ves el detalle de cada servicio con su costo neto y precio de venta. El margen es solo visible para vos.', page: '/quote/new', tabIndex: 9 },
      { selector: '[data-tour="save-button"]', title: 'Guardar con precios', description: 'Al guardar, los precios calculados se aplican al presupuesto. El cliente solo ve los precios de venta.', page: '/quote/new' },
    ],
  },
];

interface TourContextType {
  isActive: boolean;
  currentSectionId: string | null;
  currentSectionLabel: string | null;
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

  const emitTabChange = useCallback((step: TourStep) => {
    if (step.tabIndex !== undefined) {
      window.dispatchEvent(new CustomEvent('tour-change-tab', { detail: { tabIndex: step.tabIndex } }));
    }
  }, []);

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
    const firstStep = sec.steps[0];
    if (firstStep.page !== location.pathname) {
      navigate(firstStep.page);
    }
    // Emit tab change for the first step
    setTimeout(() => {
      if (firstStep.tabIndex !== undefined) {
        window.dispatchEvent(new CustomEvent('tour-change-tab', { detail: { tabIndex: firstStep.tabIndex } }));
      }
    }, 200);
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
      if (nextS) {
        if (nextS.page !== location.pathname) {
          navigate(nextS.page);
        }
        emitTabChange(nextS);
      }
    } else {
      endTour();
    }
  }, [currentStepIndex, steps, endTour, navigate, location.pathname, emitTabChange]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      const prevS = steps[prevIdx];
      if (prevS) {
        if (prevS.page !== location.pathname) {
          navigate(prevS.page);
        }
        emitTabChange(prevS);
      }
    }
  }, [currentStepIndex, steps, navigate, location.pathname, emitTabChange]);

  return (
    <TourContext.Provider value={{ isActive, currentSectionId, currentSectionLabel: section?.label ?? null, currentStepIndex, currentStep, totalSteps: steps.length, startTour, endTour, nextStep, prevStep, targetRect }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
