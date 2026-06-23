import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MINDLOOP",
  description: "Premium animated app for practicing guesstimates",
};

import NavigationWrapper from "./components/NavigationWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body>
        <NavigationWrapper>{children}</NavigationWrapper>
        <Analytics />
        <GoogleAnalytics gaId="G-22XC489WJG" />
      </body>
    </html>
  );
}
