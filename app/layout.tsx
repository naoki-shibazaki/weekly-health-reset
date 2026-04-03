import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Health Reset",
  description: "日曜朝に食材が届く、週次サイクルで健康習慣を積み上げるアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
