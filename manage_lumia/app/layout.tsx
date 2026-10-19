import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUMIA · 운영 콘솔",
  description: "LUMIA 운영팀 관리자 콘솔",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
