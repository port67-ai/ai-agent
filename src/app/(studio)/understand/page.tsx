import { ServicePage } from "@/components/studio/ServicePage";
import { services } from "@/components/studio/services";
export const metadata = {
  alternates: { canonical: "https://port67.ai/understand" },
  title: services.understand.seo,
  description: services.understand.lead,
};
export default function Page() {
  return <ServicePage id="understand" />;
}
