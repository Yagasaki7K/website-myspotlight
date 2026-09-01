import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/StyledComponentsRegistry";

export const metadata: Metadata = { title: "MySpotlight", description: "Organize arquivos de áudio autorizados de uma playlist." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><StyledComponentsRegistry>{children}</StyledComponentsRegistry></body></html>; }
