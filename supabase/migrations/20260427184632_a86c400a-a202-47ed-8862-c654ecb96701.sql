-- Rooms: full game state lives here
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'lobby', -- lobby | playing | ended
  starting_team TEXT, -- red | blue
  current_team TEXT, -- red | blue
  current_clue_word TEXT,
  current_clue_number INTEGER,
  guesses_left INTEGER DEFAULT 0,
  red_remaining INTEGER DEFAULT 0,
  blue_remaining INTEGER DEFAULT 0,
  winner TEXT, -- red | blue | null
  cards JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{word, color, revealed}]
  clue_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL, -- browser-generated client id
  nickname TEXT NOT NULL,
  team TEXT, -- red | blue | null (spectator until picked)
  is_spymaster BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

CREATE INDEX idx_players_room ON public.players(room_id);
CREATE INDEX idx_rooms_code ON public.rooms(code);

-- Public party-game access: anyone with the code can play
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms public read" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms public insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms public update" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "rooms public delete" ON public.rooms FOR DELETE USING (true);

CREATE POLICY "players public read" ON public.players FOR SELECT USING (true);
CREATE POLICY "players public insert" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "players public update" ON public.players FOR UPDATE USING (true);
CREATE POLICY "players public delete" ON public.players FOR DELETE USING (true);

-- Realtime
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER rooms_touch BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();