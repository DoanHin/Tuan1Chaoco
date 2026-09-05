export interface Question {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  isTieBreaker?: boolean;
}

export interface Team {
  id: 1 | 2;
  name: string;
  score: number;
  color: 'blue' | 'red';
}

export type GameScreen = 'welcome' | 'team_setup' | 'board' | 'game_over';

export interface HistoryAction {
  questionId: number;
  teamId: 1 | 2;
  wasCorrect: boolean;
  prevTeam1Score: number;
  prevTeam2Score: number;
  prevTurn: 1 | 2;
}
