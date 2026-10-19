import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "证研 · 投资命题研究台",
  description: "把投资判断拆成可追溯的证据链。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
