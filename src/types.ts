
export type Category = 'Technical' | 'Tactical' | 'Mental' | 'Social' | 'Situation' | 'Physical';

export interface EvaluationItem {
  name: string;
  category: Category;
}

export interface Player {
  id: string;
  name: string;
  grade: string;
  birthDate?: string;
  dominantArm?: string;
}

export interface IDPGoals {
  graduationGoal: string;
  periods?: Record<string, GoalSet>; // Key format: "Grade_Period" (e.g., "高校1年生_4-7月")
  period1?: GoalSet; // Legacy support
  period2?: GoalSet; // Legacy support
  period3?: GoalSet; // Legacy support
}

export interface GoalSet {
  performanceGoal: string;
  processGoal: string;
  metrics: string;
  interviewDate: string;
  review: string;
}

export interface Evaluation {
  period: string;
  scores: Record<string, number>;
  videoUrl?: string;
  feedback?: string;
}

export interface MatchStats {
  id: string;
  date: string;
  opponent: string;
  paOutside: { shots: number; saves: number };
  paInside: { shots: number; saves: number };
  highBall: { attacks: number; successes: number; errors: number };
  oneVsOneB: { attacks: number; successes: number; errors: number };
  sweeper: { attacks: number; successes: number; errors: number };
  passDF: { total: number; successes: number };
  passMF: { total: number; successes: number };
  passFW: { total: number; successes: number };
}

export interface TestResults {
  id: string;
  date: string;
  kick: {
    right: number[];
    left: number[];
    punt: number[];
  };
  shootStop: {
    short: number[][][]; // [row][col][saves, shots]
    long: number[][][]; // [row][col][saves, shots]
  };
}

export interface PlayerProfile {
  name: string;
  grade: string;
  height: string;
  weight: string;
  dominantFoot: string;
  dominantArm: string;
  birthDate: string;
}

export interface PlayerData {
  id: string;
  profile?: PlayerProfile;
  goals: IDPGoals;
  evaluations: Evaluation[];
  matchStats: MatchStats[];
  testResults: TestResults[];
}
