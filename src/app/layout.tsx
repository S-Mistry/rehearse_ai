import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-body text-grey-1 antialiased">
        {children}
      </body>
    </html>
  );
}
