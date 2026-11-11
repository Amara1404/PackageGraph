import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/auth/jwt";
import PageHeader from "@/components/PageHeader";
import PackageExplorer from "@/components/PackageExplorer";

export default async function PackagesPage() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;

  return (
    <>
      <PageHeader
        title="Packages"
        description="Search the dependency graph. Select a package to see what it depends on (explosion) and what depends on it (implosion)."
      />
      <PackageExplorer role={session?.role} />
    </>
  );
}
