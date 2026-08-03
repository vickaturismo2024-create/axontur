import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const HISTORY_KEY = 'axontur_history_stack';

export function useHistoryTracker() {
  const location = useLocation();

  useEffect(() => {
    try {
      const currentUrl = location.pathname + location.search;
      let stack: string[] = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
      
      // If we are navigating to the exact same page we are already on, do nothing
      if (stack[stack.length - 1] === currentUrl) return;

      // Anti-duplication: check if URL exists in stack
      const existingIndex = stack.indexOf(currentUrl);
      if (existingIndex !== -1) {
        // Truncate the stack to this point (we are "going back" to it)
        stack = stack.slice(0, existingIndex + 1);
      } else {
        // It's a new URL, push it
        stack.push(currentUrl);
      }

      // Limit stack size just in case
      if (stack.length > 50) stack.shift();

      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(stack));
    } catch (e) {
      console.error('History tracker error', e);
    }
  }, [location.pathname, location.search]);
}
