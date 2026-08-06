import type { Metadata } from "next";
import { AboutPage } from "@/components/about/about-page";
import { applicationIdentity } from "@/lib/application-identity";

export const metadata: Metadata = {
  title: "About",
  description: `${applicationIdentity.applicationName} product information.`,
};

export default function AboutRoute() {
  return <AboutPage />;
}
