import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/auth/jwt";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;

  return (
    <div className="flex-1 flex min-h-screen bg-[var(--color-canvas)]">
      <Sidebar username={session?.username} role={session?.role} />
      <main className="flex-1 px-8 py-6 max-w-5xl">{children}</main>
    </div>
  );
}
