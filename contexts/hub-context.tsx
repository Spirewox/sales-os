'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'fudfarmer_location';

type HubContextValue = { selectedHub: string; setSelectedHub: (name: string) => void };

const HubContext = createContext<HubContextValue | null>(null);

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'All';
  } catch {
    return 'All';
  }
}

/**
 * The app-wide location. The sidebar switcher and every page's location filter read and write
 * this one value, so choosing Lekki once scopes Sales, Inventory, Analytics and the rest.
 * Stored per browser; unknown or no-longer-permitted names fall back to "All".
 */
export function HubContextProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [selectedHub, setState] = useState<string>(() => (typeof window === 'undefined' ? 'All' : readStored()));
  const setSelectedHub = useCallback((name: string) => {
    setState(name);
    try {
      if (name === 'All') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, name);
    } catch {
      /* storage blocked: keep the in-memory value */
    }
  }, []);
  const value = useMemo(() => ({ selectedHub, setSelectedHub }), [selectedHub, setSelectedHub]);
  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHubContext(): HubContextValue | null {
  return useContext(HubContext);
}
