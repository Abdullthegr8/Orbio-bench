import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description = "Which model gives you the most passing code per dollar on an Orbio key? Sandbox-graded on hidden tests, cost measured per call.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Orbio Bench", template: "%s | Orbio Bench" },
  description,
  openGraph: { title: "Orbio Bench", description, type: "website", images: [{ url: "/card", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Orbio Bench", description, images: ["/card"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#EEF2F6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Public+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2">
          Skip to content
        </a>
        <Sidebar />
        <main id="content" className="min-h-screen px-4 pb-20 pt-16 sm:px-8 md:pl-[19rem] md:pr-10 md:pt-10">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
