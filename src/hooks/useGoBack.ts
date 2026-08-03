import { useNavigate } from 'react-router-dom';
import { HISTORY_KEY } from './useHistoryTracker';

/**
 * Hook para manejar el botón "Volver atrás" con lógica anti-bucles.
 * @param fallbackPath Ruta por defecto si no hay historial previo o si es nivel raíz.
 * @param isRootLevel Si es true, ignora el historial y SIEMPRE navega a la ruta raíz/fallback (ideal para botones "Volver al Dashboard" en secciones principales).
 */
export function useGoBack(fallbackPath: string = '/', isRootLevel: boolean = false) {
  const navigate = useNavigate();

  const goBack = () => {
    if (isRootLevel) {
      navigate(fallbackPath);
      return;
    }

    try {
      const stackStr = sessionStorage.getItem(HISTORY_KEY);
      if (stackStr) {
        const stack = JSON.parse(stackStr);
        // Si hay al menos 2 elementos, el penúltimo es la página anterior real sin bucles
        if (stack.length > 1) {
          const previousUrl = stack[stack.length - 2];
          navigate(previousUrl);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading history stack in goBack', e);
    }

    // Fallback si no hay historial válido
    navigate(fallbackPath);
  };

  return goBack;
}
