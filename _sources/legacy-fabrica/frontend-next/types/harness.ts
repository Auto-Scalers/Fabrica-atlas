export interface PillarSuggestion {
  status: boolean;
  description: string;
  why: string;
  contains: string[];
  triggers?: string[];
  relevant_paths?: string[];
}

export interface EvolutionObjective {
  status: boolean;
  description: string;
  objective: string;
}

export interface FillQueue {
  os_prompts?: number;
  data?: number;
  missions?: number;
  toolboxes?: number;
  inbox?: {
    raw: number;
    analysing: number;
    gateway: number;
    discovery?: string[];
    raw_items?: Record<string, any>[];
    analysing_items?: Record<string, any>[];
  };
  runtime?: {
    pillars: number;
    evolution_objectives: number;
  };
}

export interface RuntimeYaml {
  freshness: {
    last_edited: string | null;
    last_synced: string;
    sync_count: number;
    sync_status: string;
  };
  metrics: {
    review_queue: number;
    backlog: number;
    pillars: {
      actives: number;
      validated: number;
      suggestions: number;
    };
    evolution_objectives?: {
      actives: number;
      validated: number;
      suggestions: number;
    };
    fill_queue?: Record<string, any>;
  };
  review_queue: string[];
  backlog: string[];
  pillars: {
    actives: string[];
    suggestions: Record<string, PillarSuggestion>;
    validated: {
      active: number;
      total: number;
    };
  };
  evolution_objectives: {
    actives: string[];
    suggestions: Record<string, EvolutionObjective>;
    validated?: {
      active: number;
      total: number;
    };
  };
  fill_queue: FillQueue;
  recent_events: string[];
}
