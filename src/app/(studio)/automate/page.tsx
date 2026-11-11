import { ServicePage } from "@/components/studio/ServicePage";
import { services } from "@/components/studio/services";
export const metadata = {
  alternates: { canonical: "https://port67.ai/automate" },
  title: services.automate.seo,
  description: services.automate.lead,
};
export default function Page() {
  return <ServicePage id="automate" />;
}
