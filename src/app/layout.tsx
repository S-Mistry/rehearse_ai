import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Rehearse AI | Behavioural Interview Rehearsal",
  description:
    "A structured behavioural interview rehearsal desk with voice answers, rubric scoring, and coaching-grade feedback.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfairDisplay.variable} min-h-screen bg-body text-grey-1 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
