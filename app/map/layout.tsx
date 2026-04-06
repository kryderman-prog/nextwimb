import { AuthProvider } from "@/hooks/auth-context";
import { ReactNode } from "react";

export default function MapLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
