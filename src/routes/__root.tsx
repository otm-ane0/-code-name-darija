import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import faviconUrl from "../assets/arabic.svg";
import zellijUrl from "../assets/zellij-bg.jpg";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold gold-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة ما لقيناهاش</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          راجع للدار وحاول مرة أخرى.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            رجع للدار
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "كلمة — Kelma | لعبة دارجة مغربية" },
      { name: "description", content: "لعبة جماعية بالدارجة المغربية مستوحاة من Codenames. لعب مع الصحاب أونلاين." },
      { property: "og:title", content: "كلمة — Kelma | لعبة دارجة مغربية" },
      { property: "og:description", content: "لعبة جماعية بالدارجة المغربية مستوحاة من Codenames. لعب مع الصحاب أونلاين." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "كلمة — Kelma | لعبة دارجة مغربية" },
      { name: "twitter:description", content: "لعبة جماعية بالدارجة المغربية مستوحاة من Codenames. لعب مع الصحاب أونلاين." },
      // Removed external Lovable preview images to avoid external branding
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", href: faviconUrl },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        <style>{`:root { --zellij-image: url(${zellijUrl}); }`}</style>
      </head>
      <body className="zellij-bg">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
