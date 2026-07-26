import type { Metadata } from "next";
import "./tokens.css";

export const metadata: Metadata = {
  title: "Margin Lab — Free P&L Analysis",
  description:
    "Upload your P&L, get a revenue growth management analysis back in minutes.",
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
