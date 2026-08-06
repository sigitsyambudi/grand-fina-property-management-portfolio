import type { Metadata } from "next";
import { LocalizationProvider } from "@/components/localization/localization-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | Grand Fina Portfolio Edition",
    template: "%s | Grand Fina Portfolio Edition",
  },
  description:
    "A production-oriented property management portfolio project using entirely fictional demonstration data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full">
        <LocalizationProvider>{children}</LocalizationProvider>
      </body>
    </html>
  );
}
