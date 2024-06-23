import { TooltipProvider } from "~/components/ui/tooltip";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "~/components/ui/sonner";
import type { PropsWithChildren } from "react";
import { ThemeProvider } from "next-themes";
import { TrpcProvider } from "~/lib/trpc";
import type { Metadata } from "next";
import { cn } from "~/lib/utils";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], weight: "variable", variable: "--font-inter" });
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "UnWebhook",
  description: "A Webhook Request Catcher by u22n",
};

export default function RootLayout({ children }: Readonly<PropsWithChildren>) {
  return (
    <html lang="en" className="h-svh max-h-svh" suppressHydrationWarning>
      <body className={cn(inter.variable, jetBrainsMono.variable, "h-full antialiased")}>
        <ThemeProvider
          enableColorScheme
          enableSystem
          defaultTheme="system"
          disableTransitionOnChange
          attribute="class"
        >
          <TrpcProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </TrpcProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
