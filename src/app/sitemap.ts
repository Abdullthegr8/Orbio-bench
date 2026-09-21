import type { MetadataRoute } from "next";
import { modelSlug } from "@/lib/format";
import { MODELS } from "@/lib/models";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paths = ["", "/race", "/tasks", ...MODELS.map((m) => `/model/${modelSlug(m.id)}`)];
  return paths.map((p) => ({ url: `${site}${p}` }));
}
