import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { communityConfig } from '../config';

interface CommunityContextType {
  community: string;
  setCommunity: (c: string) => void;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [community, setCommunityState] = useState<string>(communityConfig.tokenSymbol);

  useEffect(() => {
    const saved = localStorage.getItem('selected_community');
    if (saved) {
      setCommunityState(saved);
    }
  }, []);

  const setCommunity = (c: string) => {
    setCommunityState(c);
    localStorage.setItem('selected_community', c);
  };

  return (
    <CommunityContext.Provider value={{ community, setCommunity }}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
