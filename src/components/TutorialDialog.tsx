import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-3xl gold-text text-display">كيفاش نلعبو</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-5 text-base leading-relaxed">
            <Section title="🎯 الهدف">
              فريقين: <span className="text-team-red font-bold">الأحمر</span> و
              <span className="text-team-blue font-bold"> الأزرق</span>. كل فريق خاصو يكتشف الكلمات ديالو قبل
              الفريق الآخر.
            </Section>

            <Section title="👥 الأدوار">
              <ul className="list-disc pr-5 space-y-1">
                <li>
                  <b>الشيخ (Spymaster):</b> كيشوف الألوان كاملين. كيعطي كلمة واحدة + رقم.
                  مثال: <span className="bg-muted px-2 rounded">ماكلة 2</span>
                </li>
                <li>
                  <b>اللاعبين:</b> كيشوفو غير الكلمات. خاصهم يخمنو شنو قصد الشيخ.
                </li>
              </ul>
            </Section>

            <Section title="🎲 قواعد التخمين">
              عندكم الحق تخمنو حتى لـ <b>(الرقم + 1)</b> ديال الكلمات. كل كلمة كتختار:
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>✅ <b className="text-team-red">إيلا كانت ديالكم:</b> كتنكشف، وكتقدرو تكملو.</li>
                <li>⚪ <b>إيلا كانت محايدة:</b> الدور كيسالي.</li>
                <li>❌ <b>إيلا كانت ديال الفريق الآخر:</b> كتعطيوهم نقطة، والدور كيسالي.</li>
                <li>💀 <b className="text-destructive">الكلمة السوداء (القاتل):</b> خسرتو الپارتي على طول!</li>
              </ul>
            </Section>

            <Section title="🏆 الفوز">
              الفريق اللي كيكشف كاع الكلمات ديالو هو الرابح. ولا الفريق اللي ما اختارش الكلمة السوداء كيربح إيلا
              الفريق الآخر اختارها.
            </Section>

            <Section title="💡 نصيحة">
              الشيخ خاصو يفكر مزيان: كلمة وحدة قادر تربط بزاف ديال الكلمات. بصح، حذاري من الكلمات اللي
              قريبين للقاتل!
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-2 text-primary">{title}</h3>
      <div className="text-foreground/90">{children}</div>
    </div>
  );
}
