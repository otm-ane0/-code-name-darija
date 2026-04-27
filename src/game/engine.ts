import { DARIJA_WORDS } from "./words";
import type { Card, Team } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateBoard(): { cards: Card[]; startingTeam: Team } {
  const startingTeam: Team = Math.random() < 0.5 ? "red" : "blue";
  const redCount = startingTeam === "red" ? 9 : 8;
  const blueCount = startingTeam === "blue" ? 9 : 8;

  const colors: Card["color"][] = [
    ...Array(redCount).fill("red"),
    ...Array(blueCount).fill("blue"),
    ...Array(7).fill("neutral"),
    "assassin",
  ];

  const words = shuffle(DARIJA_WORDS).slice(0, 25);
  const shuffled = shuffle(colors);

  return {
    cards: words.map((word, i) => ({ word, color: shuffled[i], revealed: false })),
    startingTeam,
  };
}

export function genRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function genClientId(): string {
  if (typeof window === "undefined") return Math.random().toString(36).slice(2);
  let id = localStorage.getItem("kelma_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("kelma_client_id", id);
  }
  return id;
}
