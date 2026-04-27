import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { genClientId, generateBoard } from "@/game/engine";
import type { Card as GameCard, ClueLogEntry, Player, Room, Team } from "@/game/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, LogOut, Crown, Eye, RotateCcw, Skull, Sparkles } from "lucide-react";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `روم ${params.code} — كَلْمَة` },
      { name: "description", content: "دخل للروم وألعب كلمة بالدارجة مع الصحاب." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  const clientId = useMemo(() => genClientId(), []);
  const nickname = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("kelma_nick") || "" : ""),
    []
  );

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsName, setNeedsName] = useState(!nickname);
  const [tempName, setTempName] = useState("");

  const me = players.find((p) => p.player_id === clientId);
  const isHost = room?.host_id === clientId;

  // Load + subscribe
  useEffect(() => {
    let active = true;
    let roomChan: ReturnType<typeof supabase.channel> | null = null;
    let playersChan: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: r, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (!active) return;
      if (error || !r) {
        toast.error("الروم ما لقيناهش");
        navigate({ to: "/" });
        return;
      }
      const typed = r as unknown as Room;
      setRoom(typed);

      const { data: ps } = await supabase.from("players").select("*").eq("room_id", typed.id);
      if (!active) return;
      setPlayers((ps as unknown as Player[]) || []);
      setLoading(false);

      // ensure I'm in the room (in case of refresh)
      const name = localStorage.getItem("kelma_nick");
      if (name && !(ps || []).some((p) => p.player_id === clientId)) {
        await supabase.from("players").upsert(
          { room_id: typed.id, player_id: clientId, nickname: name },
          { onConflict: "room_id,player_id" }
        );
      }

      roomChan = supabase
        .channel(`room-${typed.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${typed.id}` },
          (payload) => {
            if (payload.eventType === "DELETE") {
              navigate({ to: "/" });
              return;
            }
            setRoom(payload.new as unknown as Room);
          }
        )
        .subscribe();

      playersChan = supabase
        .channel(`players-${typed.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${typed.id}` },
          async () => {
            const { data: fresh } = await supabase
              .from("players")
              .select("*")
              .eq("room_id", typed.id);
            setPlayers((fresh as unknown as Player[]) || []);
          }
        )
        .subscribe();
    }
    load();
    return () => {
      active = false;
      if (roomChan) supabase.removeChannel(roomChan);
      if (playersChan) supabase.removeChannel(playersChan);
    };
  }, [code, clientId, navigate]);

  async function joinWithName() {
    if (!tempName.trim() || !room) return;
    localStorage.setItem("kelma_nick", tempName.trim());
    await supabase.from("players").upsert(
      { room_id: room.id, player_id: clientId, nickname: tempName.trim() },
      { onConflict: "room_id,player_id" }
    );
    setNeedsName(false);
  }

  if (needsName) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-6 max-w-sm w-full bg-card/80 backdrop-blur">
          <h2 className="text-2xl font-bold mb-4 gold-text">دخل للروم {code}</h2>
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="السمية ديالك"
            className="mb-4 h-12"
            autoFocus
          />
          <Button onClick={joinWithName} className="w-full h-12">دخل</Button>
        </Card>
      </main>
    );
  }

  if (loading || !room) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">كنحملو...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 md:px-6 py-4 md:py-6">
      <Header room={room} isHost={isHost} />
      {room.phase === "lobby" ? (
        <Lobby room={room} players={players} me={me} isHost={isHost} clientId={clientId} />
      ) : (
        <GameView room={room} players={players} me={me} isHost={isHost} />
      )}
    </main>
  );
}

function Header({ room, isHost }: { room: Room; isHost: boolean }) {
  const navigate = useNavigate();
  function copyLink() {
    const url = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(url);
    toast.success("تنسخ اللينك ✨");
  }
  async function leave() {
    const clientId = genClientId();
    await supabase.from("players").delete().eq("room_id", room.id).eq("player_id", clientId);
    if (isHost) await supabase.from("rooms").delete().eq("id", room.id);
    navigate({ to: "/" });
  }
  return (
    <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 gap-3 flex-wrap">
      <Link to="/" className="text-2xl font-black gold-text text-display">كَلْمَة</Link>
      <div className="flex items-center gap-2">
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/60 hover:border-primary/60 transition"
        >
          <span className="text-xs text-muted-foreground">كود:</span>
          <span className="font-mono font-bold tracking-widest text-primary" dir="ltr">{room.code}</span>
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
        <Button variant="ghost" size="sm" onClick={leave}>
          <LogOut className="h-4 w-4 ml-1" /> خرج
        </Button>
      </div>
    </div>
  );
}

function Lobby({
  room,
  players,
  me,
  isHost,
  clientId,
}: {
  room: Room;
  players: Player[];
  me?: Player;
  isHost: boolean;
  clientId: string;
}) {
  async function pickTeam(team: Team) {
    if (!me) return;
    await supabase.from("players").update({ team }).eq("id", me.id);
  }
  async function toggleSpymaster() {
    if (!me || !me.team) return toast.error("اختار الفريق أولا");
    // unset other spymasters in same team
    const sameTeamSpy = players.find(
      (p) => p.team === me.team && p.is_spymaster && p.id !== me.id
    );
    if (sameTeamSpy && !me.is_spymaster) {
      await supabase.from("players").update({ is_spymaster: false }).eq("id", sameTeamSpy.id);
    }
    await supabase.from("players").update({ is_spymaster: !me.is_spymaster }).eq("id", me.id);
  }

  async function startGame() {
    const redSpy = players.find((p) => p.team === "red" && p.is_spymaster);
    const blueSpy = players.find((p) => p.team === "blue" && p.is_spymaster);
    if (!redSpy || !blueSpy) return toast.error("خاص شيخ لكل فريق");

    await supabase
      .from("rooms")
      .update({
        phase: "playing",
        guesses_left: 0,
        current_clue_word: null,
        current_clue_number: null,
      })
      .eq("id", room.id);
  }

  const red = players.filter((p) => p.team === "red");
  const blue = players.filter((p) => p.team === "blue");
  const none = players.filter((p) => !p.team);

  return (
    <div className="max-w-5xl mx-auto grid gap-4 md:grid-cols-2">
      <TeamPanel
        team="red"
        players={red}
        meId={clientId}
        onJoin={() => pickTeam("red")}
        onToggleSpy={toggleSpymaster}
        meTeam={me?.team}
        meIsSpy={me?.is_spymaster ?? false}
      />
      <TeamPanel
        team="blue"
        players={blue}
        meId={clientId}
        onJoin={() => pickTeam("blue")}
        onToggleSpy={toggleSpymaster}
        meTeam={me?.team}
        meIsSpy={me?.is_spymaster ?? false}
      />

      {none.length > 0 && (
        <Card className="md:col-span-2 p-4 bg-card/80 backdrop-blur">
          <div className="text-sm text-muted-foreground mb-2">في الانتظار:</div>
          <div className="flex flex-wrap gap-2">
            {none.map((p) => (
              <Badge key={p.id} variant="secondary">{p.nickname}</Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="md:col-span-2 p-6 bg-card/80 backdrop-blur text-center">
        {isHost ? (
          <Button
            onClick={startGame}
            size="lg"
            className="h-14 text-lg font-bold animate-pulse-glow w-full md:w-auto px-12"
          >
            <Sparkles className="h-5 w-5 ml-2" /> ابدا اللعبة
          </Button>
        ) : (
          <p className="text-muted-foreground">كنتسناو الـ host يبدا اللعبة...</p>
        )}
      </Card>
    </div>
  );
}

function TeamPanel({
  team,
  players,
  onJoin,
  onToggleSpy,
  meTeam,
  meIsSpy,
}: {
  team: Team;
  players: Player[];
  meId: string;
  onJoin: () => void;
  onToggleSpy: () => void;
  meTeam?: Team | null;
  meIsSpy: boolean;
}) {
  const isMine = meTeam === team;
  const colorCls =
    team === "red"
      ? "border-team-red/50 bg-team-red/10"
      : "border-team-blue/50 bg-team-blue/10";
  const label = team === "red" ? "الفريق الأحمر" : "الفريق الأزرق";
  const txt = team === "red" ? "text-team-red" : "text-team-blue";

  return (
    <Card className={`p-5 backdrop-blur ${colorCls} border-2`}>
      <h3 className={`text-2xl font-black mb-4 ${txt}`}>{label}</h3>
      <div className="space-y-2 mb-4 min-h-[60px]">
        {players.length === 0 && <div className="text-xs text-muted-foreground">والو حتى واحد</div>}
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            {p.is_spymaster && <Crown className="h-4 w-4 text-primary" />}
            <span className="font-medium">{p.nickname}</span>
            {p.is_spymaster && <span className="text-xs text-primary">(الشيخ)</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {!isMine ? (
          <Button onClick={onJoin} variant="secondary" className="flex-1">
            دخل لهاد الفريق
          </Button>
        ) : (
          <Button onClick={onToggleSpy} variant={meIsSpy ? "default" : "outline"} className="flex-1">
            <Crown className="h-4 w-4 ml-1" />
            {meIsSpy ? "ما بقيتش الشيخ" : "ولي الشيخ"}
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ===================== GAME ===================== */

function GameView({
  room,
  players,
  me,
  isHost,
}: {
  room: Room;
  players: Player[];
  me?: Player;
  isHost: boolean;
}) {
  const isSpy = me?.is_spymaster ?? false;
  const myTeam = me?.team ?? null;
  const isMyTurn = !!myTeam && room.current_team === myTeam && room.phase === "playing";
  const cards = (room.cards || []) as GameCard[];
  const ended = room.phase === "ended";

  return (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_280px] gap-4">
      <div>
        <TurnBanner room={room} myTeam={myTeam} />
        <Board
          cards={cards}
          isSpy={isSpy}
          canGuess={isMyTurn && !isSpy && !!room.current_clue_word && room.guesses_left > 0}
          onGuess={(idx) => guessCard(room, idx, myTeam!)}
        />
        {ended && <EndCard room={room} isHost={isHost} />}
        {!ended && isSpy && isMyTurn && !room.current_clue_word && (
          <ClueForm room={room} myTeam={myTeam!} />
        )}
        {!ended && !isSpy && isMyTurn && room.current_clue_word && room.guesses_left > 0 && (
          <div className="mt-4 text-center">
            <Button variant="secondary" onClick={() => endTurn(room)}>
              سالينا الدور
            </Button>
          </div>
        )}
      </div>

      <Sidebar room={room} players={players} me={me} />
    </div>
  );
}

function TurnBanner({ room, myTeam }: { room: Room; myTeam: Team | null }) {
  if (room.phase === "ended") return null;
  const isRed = room.current_team === "red";
  const teamLabel = isRed ? "الأحمر" : "الأزرق";
  const color = isRed ? "text-team-red" : "text-team-blue";
  const bg = isRed ? "bg-team-red/15 border-team-red/40" : "bg-team-blue/15 border-team-blue/40";
  const mine = myTeam === room.current_team;

  return (
    <div className={`mb-3 p-4 rounded-xl border-2 backdrop-blur ${bg} flex items-center justify-between gap-3 flex-wrap`}>
      <div>
        <div className="text-xs text-muted-foreground">الدور ديال</div>
        <div className={`text-2xl font-black ${color}`}>الفريق {teamLabel} {mine && "← ديالكم!"}</div>
      </div>
      {room.current_clue_word ? (
        <div className="text-center">
          <div className="text-xs text-muted-foreground">الكلمة</div>
          <div className="text-2xl font-black gold-text">
            {room.current_clue_word} <span className="text-primary">{room.current_clue_number}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            باقي {room.guesses_left} تخمين{room.guesses_left > 1 ? "ات" : ""}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">كنتسناو الكلمة من الشيخ...</div>
      )}
    </div>
  );
}

function Board({
  cards,
  isSpy,
  canGuess,
  onGuess,
}: {
  cards: GameCard[];
  isSpy: boolean;
  canGuess: boolean;
  onGuess: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 md:gap-3">
      {cards.map((c, i) => (
        <CardTile
          key={i}
          card={c}
          isSpy={isSpy}
          disabled={!canGuess || c.revealed}
          onClick={() => onGuess(i)}
        />
      ))}
    </div>
  );
}

function CardTile({
  card,
  isSpy,
  disabled,
  onClick,
}: {
  card: GameCard;
  isSpy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const showColor = card.revealed || isSpy;
  const colorClasses = card.revealed
    ? card.color === "red"
      ? "bg-team-red text-team-red-foreground"
      : card.color === "blue"
      ? "bg-team-blue text-team-blue-foreground"
      : card.color === "assassin"
      ? "bg-assassin text-foreground"
      : "bg-neutral-card text-assassin"
    : showColor
    ? card.color === "red"
      ? "bg-team-red/30 border-team-red text-foreground"
      : card.color === "blue"
      ? "bg-team-blue/30 border-team-blue text-foreground"
      : card.color === "assassin"
      ? "bg-assassin/80 border-foreground text-foreground"
      : "bg-neutral-card/30 border-neutral-card text-foreground"
    : "bg-card border-border text-foreground";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`card-tile relative aspect-[4/3] md:aspect-[3/2] rounded-lg border-2 px-1 py-2 font-bold text-base md:text-xl flex items-center justify-center text-center disabled:cursor-default ${colorClasses} ${
        card.revealed ? "animate-flip" : ""
      }`}
    >
      {card.color === "assassin" && card.revealed && (
        <Skull className="absolute top-1 left-1 h-4 w-4 opacity-60" />
      )}
      <span className="break-words">{card.word}</span>
    </button>
  );
}

function ClueForm({ room, myTeam }: { room: Room; myTeam: Team }) {
  const [word, setWord] = useState("");
  const [num, setNum] = useState(1);
  const remaining = myTeam === "red" ? room.red_remaining : room.blue_remaining;
  const max = Math.max(1, remaining);

  async function submit() {
    const w = word.trim();
    if (!w) return toast.error("دخل كلمة");
    await supabase
      .from("rooms")
      .update({
        current_clue_word: w,
        current_clue_number: num,
        guesses_left: num + 1,
        clue_log: [
          ...(room.clue_log || []),
          { team: myTeam, word: w, number: num, guesses: [] },
        ] as unknown as never,
      })
      .eq("id", room.id);
    setWord("");
    setNum(1);
  }

  return (
    <Card className="mt-4 p-4 bg-card/80 backdrop-blur border-primary/40">
      <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
        <Crown className="h-4 w-4 text-primary" /> أنت الشيخ — عطي كلمة + رقم
      </div>
      <div className="flex gap-2 flex-wrap">
        <Input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="كلمة"
          maxLength={30}
          className="flex-1 h-12 text-lg"
        />
        <Input
          type="number"
          min={1}
          max={max}
          value={num}
          onChange={(e) => setNum(Math.max(1, Math.min(max, +e.target.value || 1)))}
          className="w-20 h-12 text-lg text-center"
        />
        <Button onClick={submit} size="lg" className="h-12">سيفط</Button>
      </div>
    </Card>
  );
}

function Sidebar({ room, players, me }: { room: Room; players: Player[]; me?: Player }) {
  return (
    <aside className="space-y-3">
      <Card className="p-4 bg-card/80 backdrop-blur">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 rounded-lg bg-team-red/15 border border-team-red/40">
            <div className="text-xs text-muted-foreground">الأحمر</div>
            <div className="text-3xl font-black text-team-red">{room.red_remaining}</div>
          </div>
          <div className="p-3 rounded-lg bg-team-blue/15 border border-team-blue/40">
            <div className="text-xs text-muted-foreground">الأزرق</div>
            <div className="text-3xl font-black text-team-blue">{room.blue_remaining}</div>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-card/80 backdrop-blur">
        <div className="text-sm font-bold mb-2 flex items-center gap-1">
          <Eye className="h-4 w-4" /> اللاعبين
        </div>
        <div className="space-y-1 text-sm">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  p.team === "red" ? "bg-team-red" : p.team === "blue" ? "bg-team-blue" : "bg-muted"
                }`}
              />
              {p.is_spymaster && <Crown className="h-3 w-3 text-primary" />}
              <span className={p.player_id === me?.player_id ? "font-bold" : ""}>{p.nickname}</span>
            </div>
          ))}
        </div>
      </Card>

      {room.clue_log && room.clue_log.length > 0 && (
        <Card className="p-4 bg-card/80 backdrop-blur">
          <div className="text-sm font-bold mb-2">الكلمات السابقة</div>
          <div className="space-y-1 text-sm max-h-60 overflow-auto">
            {[...(room.clue_log as ClueLogEntry[])].reverse().map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                <span className={c.team === "red" ? "text-team-red" : "text-team-blue"}>
                  {c.word} <b>{c.number}</b>
                </span>
                <div className="flex gap-0.5">
                  {c.guesses.map((g, gi) => (
                    <span
                      key={gi}
                      className={`w-2 h-2 rounded-full ${
                        g.color === "red"
                          ? "bg-team-red"
                          : g.color === "blue"
                          ? "bg-team-blue"
                          : g.color === "assassin"
                          ? "bg-assassin border border-foreground"
                          : "bg-neutral-card"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </aside>
  );
}

function EndCard({ room, isHost }: { room: Room; isHost: boolean }) {
  const wonRed = room.winner === "red";
  return (
    <Card className={`mt-4 p-6 text-center backdrop-blur border-2 ${wonRed ? "border-team-red bg-team-red/15" : "border-team-blue bg-team-blue/15"}`}>
      <h2 className="text-3xl md:text-4xl font-black mb-2 gold-text">
        ربح الفريق {wonRed ? "الأحمر 🔴" : "الأزرق 🔵"}
      </h2>
      <p className="text-muted-foreground mb-4">برافو! نعاودو؟</p>
      {isHost && (
        <Button onClick={() => restartGame(room)} size="lg">
          <RotateCcw className="h-4 w-4 ml-2" /> پارتي جديدة
        </Button>
      )}
    </Card>
  );
}

/* ===================== ACTIONS ===================== */

async function guessCard(room: Room, idx: number, team: Team) {
  const cards = [...(room.cards as GameCard[])];
  const card = cards[idx];
  if (!card || card.revealed) return;

  cards[idx] = { ...card, revealed: true };

  let red = room.red_remaining;
  let blue = room.blue_remaining;
  let guessesLeft = room.guesses_left - 1;
  let nextTeam: Team = team;
  let winner: Team | null = null;
  let phase = room.phase;

  if (card.color === "red") red -= 1;
  else if (card.color === "blue") blue -= 1;

  // Win/lose checks
  if (card.color === "assassin") {
    winner = team === "red" ? "blue" : "red";
    phase = "ended";
  } else if (red === 0) {
    winner = "red";
    phase = "ended";
  } else if (blue === 0) {
    winner = "blue";
    phase = "ended";
  }

  // Turn-end logic
  let endTurnNow = false;
  if (card.color !== team) endTurnNow = true; // wrong color (incl neutral)
  if (guessesLeft <= 0) endTurnNow = true;

  if (endTurnNow && phase === "playing") {
    nextTeam = team === "red" ? "blue" : "red";
    guessesLeft = 0;
  }

  // Update clue log with this guess
  const log = [...(room.clue_log || [])] as ClueLogEntry[];
  if (log.length > 0) {
    log[log.length - 1] = {
      ...log[log.length - 1],
      guesses: [...log[log.length - 1].guesses, { word: card.word, color: card.color }],
    };
  }

  await supabase
    .from("rooms")
    .update({
      cards: cards as unknown as never,
      red_remaining: red,
      blue_remaining: blue,
      guesses_left: guessesLeft,
      current_team: nextTeam,
      current_clue_word: endTurnNow ? null : room.current_clue_word,
      current_clue_number: endTurnNow ? null : room.current_clue_number,
      winner,
      phase,
      clue_log: log as unknown as never,
    })
    .eq("id", room.id);
}

async function endTurn(room: Room) {
  const next: Team = room.current_team === "red" ? "blue" : "red";
  await supabase
    .from("rooms")
    .update({
      current_team: next,
      current_clue_word: null,
      current_clue_number: null,
      guesses_left: 0,
    })
    .eq("id", room.id);
}

async function restartGame(room: Room) {
  const board = generateBoard();
  await supabase
    .from("rooms")
    .update({
      phase: "lobby",
      starting_team: board.startingTeam,
      current_team: board.startingTeam,
      current_clue_word: null,
      current_clue_number: null,
      guesses_left: 0,
      red_remaining: board.cards.filter((c) => c.color === "red").length,
      blue_remaining: board.cards.filter((c) => c.color === "blue").length,
      cards: board.cards as unknown as never,
      clue_log: [] as unknown as never,
      winner: null,
    })
    .eq("id", room.id);
}
