'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '../utils/storage';

export interface UseAutonomyOptions {
  initialAutoMissions?: boolean;
  initialIntervalSeconds?: number;
}

export function useAutonomy({ initialAutoMissions = true, initialIntervalSeconds = 30 }: UseAutonomyOptions = {}) {
  const [autoMissions, setAutoMissions] = useState<boolean>(() => {
    return safeLocalStorage.getParsedItem<boolean>('fabrica_auto_missions', initialAutoMissions);
  });

  const [intervalSeconds, setIntervalSeconds] = useState<number>(() => {
    return safeLocalStorage.getParsedItem<number>('fabrica_autonomy_interval', initialIntervalSeconds);
  });

  const [isExecutingBackground, setIsExecutingBackground] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const toggleAutonomy = useCallback(() => {
    setAutoMissions(prev => {
      const next = !prev;
      safeLocalStorage.setItem('fabrica_auto_missions', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateInterval = useCallback((secs: number) => {
    setIntervalSeconds(secs);
    safeLocalStorage.setItem('fabrica_autonomy_interval', JSON.stringify(secs));
  }, []);

  useEffect(() => {
    if (!autoMissions) return;

    const timer = setInterval(() => {
      setIsExecutingBackground(true);
      setLastCheckTime(new Date().toLocaleTimeString());
      setTimeout(() => {
        setIsExecutingBackground(false);
      }, 1500);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoMissions, intervalSeconds]);

  return {
    autoMissions,
    toggleAutonomy,
    intervalSeconds,
    updateInterval,
    isExecutingBackground,
    lastCheckTime
  };
}

export default useAutonomy;
