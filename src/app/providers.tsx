"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/toaster";
import { I18nProvider } from "@/contexts/I18nContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <LanguageProvider>
          <I18nProvider>{children}</I18nProvider>
        </LanguageProvider>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
