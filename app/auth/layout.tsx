export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Render auth routes WITHOUT AuthProvider to avoid expensive auth checks
  // on public login/signup pages. AuthProvider will be available in protected routes.
  return children
}
