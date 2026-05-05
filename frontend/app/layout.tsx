import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AXIOM — AI Operating System",
  description: "Self-orchestrating multi-domain AI OS. One brain. Infinite agents.",
  metadataBase: new URL("https://axiom.vercel.app"),
  openGraph: {
    title: "AXIOM",
    description: "Self-orchestrating multi-domain AI OS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${dmSans.variable} 
          bg-axiom-black text-axiom-text antialiased font-body`}
      >
        {children}
      </body>
    </html>
  );
}
