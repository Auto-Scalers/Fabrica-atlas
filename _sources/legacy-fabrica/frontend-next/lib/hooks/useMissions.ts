'use client';

import { useState, useCallback } from 'react';

export interface MissionPipelineItem {
  id: string;
  title: string;
  objective: string;
  phase: 'draft' | 'planning' | 'execution' | 'review' | 'completed';
  status: 'DRAFT' | 'PLANNING' | 'EXECUTING' | 'WAITING_QA' | 'AUDITED' | 'COMPLETED';
  progress: number;
  subsystemKey?: string;
  createdAt: string;
}

export function useMissions(initialMissions: MissionPipelineItem[] = []) {
  const [missions, setMissions] = useState<MissionPipelineItem[]>(initialMissions);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(initialMissions[0]?.id || null);

  const addMission = useCallback((mission: Omit<MissionPipelineItem, 'id' | 'createdAt'>) => {
    const newMission: MissionPipelineItem = {
      ...mission,
      id: `msn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    setMissions(prev => [newMission, ...prev]);
    setActiveMissionId(newMission.id);
    return newMission;
  }, []);

  const updateMissionPhase = useCallback((id: string, phase: MissionPipelineItem['phase'], status: MissionPipelineItem['status'], progress: number) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, phase, status, progress } : m));
  }, []);

  const deleteMission = useCallback((id: string) => {
    setMissions(prev => prev.filter(m => m.id !== id));
    if (activeMissionId === id) {
      setActiveMissionId(null);
    }
  }, [activeMissionId]);

  return {
    missions,
    setMissions,
    activeMissionId,
    setActiveMissionId,
    addMission,
    updateMissionPhase,
    deleteMission
  };
}

export default useMissions;
