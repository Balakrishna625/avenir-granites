'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { isMaskingUnlocked, setMaskingUnlocked, verifyUnlockPIN, maskCustomerName } from '@/lib/maskingUtils';

interface MaskingContextType {
  isUnlocked: boolean;
  attemptUnlock: (pin: string) => boolean;
  lock: () => void;
  maskName: (name: string) => string;
}

const MaskingContext = createContext<MaskingContextType | undefined>(undefined);

export function MaskingProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    setIsUnlocked(isMaskingUnlocked());
  }, []);

  const attemptUnlock = (pin: string): boolean => {
    if (verifyUnlockPIN(pin)) {
      setMaskingUnlocked(true);
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const lock = () => {
    setMaskingUnlocked(false);
    setIsUnlocked(false);
  };

  const maskName = (name: string): string => {
    if (isUnlocked) return name;
    return maskCustomerName(name);
  };

  return (
    <MaskingContext.Provider value={{ isUnlocked, attemptUnlock, lock, maskName }}>
      {children}
    </MaskingContext.Provider>
  );
}

export function useMasking() {
  const context = useContext(MaskingContext);
  if (context === undefined) {
    throw new Error('useMasking must be used within a MaskingProvider');
  }
  return context;
}
