import { ServicePage } from "@/components/studio/ServicePage";
import { services } from "@/components/studio/services";
export const metadata = {
  alternates: { canonical: "https://port67.ai/explain" },
  title: services.explain.seo,
  description: services.explain.lead,
};
export default function Page() {
  return <ServicePage id="explain" />;
}
