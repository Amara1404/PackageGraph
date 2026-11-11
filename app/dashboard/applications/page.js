import PageHeader from "@/components/PageHeader";
import Applications from "@/components/Applications";

export default function ApplicationsPage() {
  return (
    <>
      <PageHeader
        title="Applications"
        description="Your services and the packages they use. This is what makes vulnerability impact reports count real applications, not just packages."
      />
      <Applications />
    </>
  );
}
