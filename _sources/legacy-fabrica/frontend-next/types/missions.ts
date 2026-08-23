export type MissionClass = 'DRAFT' | 'PLANNING' | 'EXECUTION' | 'DONE';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface MissionGoal {
  status: boolean;
  priority: Priority;
  goal: string;
  why: string;
  cause: string;
  how: string;
  benefits: string[];
  benefits_value: 'HIGH' | 'MEDIUM' | 'LOW';
  costs: string[];
  costs_value: 'HIGH' | 'MEDIUM' | 'LOW';
  worth_it: string;
  instructions: string[];
}

export interface MissionTask {
  priority_ref: number;
  progress: 'completed' | 'in-progress' | 'blocked' | 'not-started';
  last_progress_at?: string;
  task: string;
  instructions: string[];
  depends_on?: string[];
}

export interface Mission {
  model: 'standard' | 'research' | 'evolution' | 'analytics';
  objective: string;
  priority: Priority;
  last_progress_at?: string;
  state: {
    status: boolean;
    class: MissionClass;
    progress: string;
  };
  rounds: {
    status: boolean;
    persistent: boolean;
    max: number;
  };
  metrics: {
    goals: number;
    progress_percentage: string;
    tasks: number;
    round_progress_percentage?: string;
    round: number;
  };
  runtime?: {
    recent_events?: string[];
    review_queue?: string[];
    backlog?: string[];
  };
  goals: Record<string, MissionGoal>;
  tasks: Record<string, MissionTask>;
}
