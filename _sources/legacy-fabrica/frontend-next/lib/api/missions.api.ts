import { request } from './client';

export const missionsApi = {
  getMissions: () => request<{ ok: boolean; missions: any[] }>('/api/missions'),
  getMissionDetails: (id: string) => request<{ ok: boolean; mission: any }>(`/api/missions/${encodeURIComponent(id)}`),
  createMission: (title: string, objective: string, type?: string) => request<{ ok: boolean; mission: any }>('/api/missions/create', { method: 'POST', body: JSON.stringify({ title, objective, type }) }),
  updateMission: (id: string, updates: any) => request<{ ok: boolean; mission: any }>('/api/missions/update', { method: 'POST', body: JSON.stringify({ id, ...updates }) }),
  deleteMission: (id: string) => request<{ ok: boolean }>('/api/missions/delete', { method: 'POST', body: JSON.stringify({ id }) }),
  getMissionSchema: (type: string = 'standard') => request<{ ok: boolean; schema: any }>(`/api/missions/schema?type=${encodeURIComponent(type)}`),
  saveDbMission: (mission: any) => mission.id ? missionsApi.updateMission(mission.id, mission) : missionsApi.createMission(mission.title || 'Untitled', mission.objective || '', mission.type),
};
