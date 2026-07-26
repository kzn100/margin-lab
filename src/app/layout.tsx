import type { Metadata } from "next";
import "./tokens.css";

export const metadata: Metadata = {
  title: {
    default: "Margin Lab · Free P&L analysis",
    template: "%s · Margin Lab",
  },
  description:
    "Upload your P&L and get a revenue growth management analysis back in minutes.",
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
