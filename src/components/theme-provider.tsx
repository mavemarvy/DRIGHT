"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const DRIGHT_THEMES = [
  "light",
  "dark",
  "dark-blue",
  "midnight",
  "high-contrast",
  "system",
] as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={[...DRIGHT_THEMES]}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
