import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";

import { TransitionProvider } from "@/components/motion/TransitionProvider";
import { ToastProvider } from "@/components/ui/Toast";

import "./globals.css";

const sans = localFont({ src: "./fonts/geist-sans.woff2", variable: "--font-geist", weight: "100 900", display: "swap" });
const mono = localFont({ src: "./fonts/geist-mono.woff2", variable: "--font-geist-mono", weight: "100 900", display: "swap" });
const display = localFont({ src: "./fonts/newsreader-display.woff2", variable: "--font-display", weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DocuTrust AI · Every answer has a source", template: "%s · DocuTrust AI" },
  description:
    "DocuTrust AI answers questions from your team's own documents, only from files each person may open, with the source passage attached.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

/*
  Runs before first paint. Marks pages as animated so GSAP can reveal content (with a
  timer that shows everything if scripts fail), and restores a dismissed announcement.
*/
const bootScript = `(function(){var d=document.documentElement;try{if(localStorage.getItem('announce')==='off')d.setAttribute('data-announce-off','')}catch(e){}if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('js-motion');setTimeout(function(){d.classList.remove('js-motion')},3500)}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" disableTransitionOnChange>
          <TransitionProvider>
            <ToastProvider>
              <a
                href="#main"
                className="sr-only rounded-[10px] bg-ink px-4 py-2 text-on-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
              >
                Skip to content
              </a>
              {children}
            </ToastProvider>
          </TransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
