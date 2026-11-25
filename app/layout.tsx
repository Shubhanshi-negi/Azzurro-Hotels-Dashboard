import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Azzurro | Guest intelligence",
  description:
    "A private guest feedback intelligence dashboard for Azzurro Hotels. All property and review data shown is synthetic demo data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
