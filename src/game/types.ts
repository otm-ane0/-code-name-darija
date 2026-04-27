export type Team = "red" | "blue";
export type CardColor = "red" | "blue" | "neutral" | "assassin";
export type Phase = "lobby" | "playing" | "ended";

export interface Card {
  word: string;
  color: CardColor;
  revealed: boolean;
}

export interface ClueLogEntry {
  team: Team;
  word: string;
  number: number;
  guesses: { word: string; color: CardColor }[];
}

export interface Player {
  id: string;
  player_id: string;
  nickname: string;
  team: Team | null;
  is_spymaster: boolean;
  room_id: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  phase: Phase;
  starting_team: Team | null;
  current_team: Team | null;
  current_clue_word: string | null;
  current_clue_number: number | null;
  guesses_left: number;
  red_remaining: number;
  blue_remaining: number;
  winner: Team | null;
  cards: Card[];
  clue_log: ClueLogEntry[];
}
