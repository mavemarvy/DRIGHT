import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CookieBanner } from "@/components/cookie-banner";
import "./globals.css";

export const metadata: Metadata = { title:"DRIGHT", description:"DRIGHT — worldwide marketplace and social-commerce platform." };

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider>{children}<ThemeSwitcher /><CookieBanner /></ThemeProvider></body></html>;
}
