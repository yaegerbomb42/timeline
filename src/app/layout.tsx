import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Orbitron } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const fontUi = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const fontBook = Orbitron({
  variable: "--font-book",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const fontCode = IBM_Plex_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Timeline | Living Memory",
  description: "A vibrant chronicle of existence—each moment pulses with energy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${fontUi.variable} ${fontBook.variable} ${fontCode.variable} min-h-full antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
