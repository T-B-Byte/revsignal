import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RevSignal — Where Signals Become Revenue",
  description:
    "DaaS sales command center for building and closing data licensing revenue.",
};

/**
 * Inline script that runs before React hydration to prevent a flash of wrong
 * theme. Reads localStorage and applies the .light class immediately if needed.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("revsignal-theme");if(t!=="light"&&t!=="dark"&&t!=="system")t="dark";var r=t;if(t==="system"){r=window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"}if(r==="light"){document.documentElement.classList.add("light")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
