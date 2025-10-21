'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook to warn users about unsaved changes before navigating away
 * 
 * @param hasUnsavedChanges - Boolean indicating if there are unsaved changes
 * @param message - Optional custom warning message
 * 
 * @example
 * const [formData, setFormData] = useState(initialData);
 * const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);
 * useUnsavedChangesWarning(hasChanges);
 */
export function useUnsavedChangesWarning(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to leave?'
) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  // Reset navigation flag when unsaved changes become false
  useEffect(() => {
    if (!hasUnsavedChanges) {
      isNavigatingRef.current = false;
    }
  }, [hasUnsavedChanges]);

  // Warn on browser back/forward/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  // Warn on Next.js navigation (Link clicks, router.push, etc.)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Override router methods to show confirmation
    const originalPush = router.push;
    const originalBack = router.back;

    // @ts-ignore - We're temporarily overriding these methods
    router.push = (...args) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        if (window.confirm(message)) {
          isNavigatingRef.current = true;
          return originalPush.apply(router, args);
        }
      } else {
        return originalPush.apply(router, args);
      }
    };

    // @ts-ignore
    router.back = () => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        if (window.confirm(message)) {
          isNavigatingRef.current = true;
          return originalBack.call(router);
        }
      } else {
        return originalBack.call(router);
      }
    };

    // Cleanup: restore original methods
    return () => {
      router.push = originalPush;
      router.back = originalBack;
    };
  }, [hasUnsavedChanges, message, router]);

  // Provide a callback to mark navigation as intentional (e.g., after save)
  const allowNavigation = useCallback(() => {
    isNavigatingRef.current = true;
  }, []);

  return { allowNavigation };
}

/**
 * Helper hook to track form changes
 * 
 * @param initialData - The initial/saved form data
 * @param currentData - The current form data
 * @returns boolean indicating if data has changed
 * 
 * @example
 * const hasChanges = useFormChanges(initialData, formData);
 * useUnsavedChangesWarning(hasChanges);
 */
export function useFormChanges<T>(initialData: T, currentData: T): boolean {
  return JSON.stringify(initialData) !== JSON.stringify(currentData);
}
