import PageHeader from "@/components/PageHeader";
import ImpactReports from "@/components/ImpactReports";

export default function VulnerabilitiesPage() {
  return (
    <>
      <PageHeader
        title="Vulnerabilities"
        description="Packages flagged against real OSV.dev advisories, and the computed blast radius — every package and application transitively affected."
      />
      <ImpactReports />
    </>
  );
}
