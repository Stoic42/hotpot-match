import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ClientIdProvider } from "@/components/client-id-provider";

export const metadata: Metadata = {
  title: "Hotpot Party",
  description: "Cast your friends as hotpot guests and watch the chaos unfold.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientIdProvider>
          {children}
          <Toaster />
        </ClientIdProvider>
      </body>
    </html>
  );
}
