import { AuthProvider } from "@/hooks/auth-context";
import { ReactNode } from "react";

export default function DashboardLayout({
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
