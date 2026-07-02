import { useState, useEffect } from 'react';

export function useHiddenUsers() {
  const [hiddenUsers, setHiddenUsers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('hiddenUsers');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    const handleStorageChange = () => {
       try {
          const stored = localStorage.getItem('hiddenUsers');
          if (stored) setHiddenUsers(JSON.parse(stored));
       } catch (e) {}
    };
    
    window.addEventListener('hiddenUsersChanged', handleStorageChange);
    return () => window.removeEventListener('hiddenUsersChanged', handleStorageChange);
  }, []);

  const hideUser = (username: string) => {
    const newHidden = [...new Set([...hiddenUsers, username])];
    setHiddenUsers(newHidden);
    localStorage.setItem('hiddenUsers', JSON.stringify(newHidden));
    window.dispatchEvent(new Event('hiddenUsersChanged'));
  };

  const unhideUser = (username: string) => {
    const newHidden = hiddenUsers.filter(u => u !== username);
    setHiddenUsers(newHidden);
    localStorage.setItem('hiddenUsers', JSON.stringify(newHidden));
    window.dispatchEvent(new Event('hiddenUsersChanged'));
  };

  return { hiddenUsers, hideUser, unhideUser };
}
