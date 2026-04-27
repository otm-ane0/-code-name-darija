import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateBoard, genClientId, genRoomCode } from "@/game/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Users, BookOpen, Zap } from "lucide-react";
import { TutorialDialog } from "@/components/TutorialDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "كلمة — Kelma | لعبة دارجة مغربية" },
      { name: "description", content: "ابدا لعبة كلمة بالدارجة مع الصحاب. دير روم، شارك اللينك، وألعب." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  async function createRoom() {
    const name = nickname.trim();
    if (!name) return toast.error("دخل سميتك أولا");
    setBusy(true);
    try {
      const clientId = genClientId();
      const board = generateBoard();
      const roomCode = genRoomCode();

      const { data: room, error } = await supabase
        .from("rooms")
        .insert({
          code: roomCode,
          host_id: clientId,
          phase: "lobby",
          starting_team: board.startingTeam,
          current_team: board.startingTeam,
          red_remaining: board.cards.filter((c) => c.color === "red").length,
          blue_remaining: board.cards.filter((c) => c.color === "blue").length,
          cards: board.cards as unknown as never,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: pErr } = await supabase.from("players").insert({
        room_id: room.id,
        player_id: clientId,
        nickname: name,
      });
      if (pErr) throw pErr;

      localStorage.setItem("kelma_nick", name);
      navigate({ to: "/room/$code", params: { code: roomCode } });
    } catch (e) {
      console.error(e);
      toast.error("ما قدرناش نديرو الروم");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    const name = nickname.trim();
    const c = code.trim().toUpperCase();
    if (!name) return toast.error("دخل سميتك");
    if (c.length < 4) return toast.error("كود الروم ناقص");
    setBusy(true);
    try {
      const { data: room, error } = await supabase
        .from("rooms")
        .select("id,code")
        .eq("code", c)
        .maybeSingle();
      if (error) throw error;
      if (!room) {
        toast.error("الروم ما كاينش");
        return;
      }

      const clientId = genClientId();
      await supabase.from("players").upsert(
        { room_id: room.id, player_id: clientId, nickname: name },
        { onConflict: "room_id,player_id" }
      );

      localStorage.setItem("kelma_nick", name);
      navigate({ to: "/room/$code", params: { code: room.code } });
    } catch (e) {
      console.error(e);
      toast.error("ما قدرناش ندخلو");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="h-4 w-4" />
            <span>لعبة جماعية بالدارجة</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-black gold-text text-display mb-4 leading-none">
            كَلْمَة
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            دير روم، عيط لصحابك، واختاروا الكلمات قبل الفريق الآخر. حذاري من الكلمة السوداء!
          </p>
        </div>

        <Card className="p-6 md:p-8 backdrop-blur bg-card/80 border-border/60 shadow-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm mb-2 text-muted-foreground">السمية ديالك</label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="مثلا: كريم"
                maxLength={20}
                className="text-lg h-12 bg-background/50"
              />
            </div>

            <Button
              onClick={createRoom}
              disabled={busy}
              size="lg"
              className="w-full h-14 text-lg font-bold animate-pulse-glow"
            >
              <Zap className="h-5 w-5 ml-2" />
              دير روم جديد
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground">ولا</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="كود الروم"
                maxLength={5}
                className="text-center text-xl tracking-[0.3em] font-bold h-12 bg-background/50"
                dir="ltr"
              />
              <Button
                onClick={joinRoom}
                disabled={busy}
                variant="secondary"
                size="lg"
                className="h-12 px-6 whitespace-nowrap"
              >
                <Users className="h-4 w-4 ml-2" />
                دخل
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setTutorialOpen(true)}
            className="text-muted-foreground hover:text-primary"
          >
            <BookOpen className="h-4 w-4 ml-2" />
            كيفاش نلعب؟
          </Button>
        </div>
      </div>

      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </main>
  );
}
