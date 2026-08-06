import type { Metadata } from "next";
import { PropertySettings } from "@/components/settings/property-settings";
import { deriveSettings } from "@/lib/data/derived";
import { getWorkspaceData } from "@/lib/data/workspace-read";

export const metadata: Metadata = {
  title: "Property Settings",
  description:
    "Fictional Emerald Haven Residence configuration and portfolio capability status.",
};

export default async function SettingsPage() {
  const data = await getWorkspaceData();

  if (!data) {
    return null;
  }

  return <PropertySettings data={deriveSettings(data)} />;
}
