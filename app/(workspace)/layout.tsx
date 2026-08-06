import { redirect } from "next/navigation";
import { AccessUnavailable } from "@/components/auth/access-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { getPropertyAccess } from "@/lib/auth/access";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await getPropertyAccess();

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "unauthorized") {
    return <AccessUnavailable />;
  }

  return (
    <AppShell
      identity={{
        displayName: access.displayName,
        role: access.role,
      }}
      propertyName={access.property.name}
    >
      {children}
    </AppShell>
  );
}
