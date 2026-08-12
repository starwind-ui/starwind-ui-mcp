import { z } from "zod";

const PRO_MANIFEST_URL = "https://pro.starwind.dev/r/manifest.json";
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const RETRY_TTL_MS = 60 * 1000;

const proBlockSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  categories: z.array(z.string()),
  keywords: z.array(z.string()),
  plan: z.enum(["free", "pro"]),
  installCommand: z.string(),
  previewUrl: z.string(),
});

const proManifestSchema = z
  .object({
    version: z.string(),
    baseUrl: z.string().url(),
    totalBlocks: z.number(),
    categories: z.array(z.string()),
    blocks: z.array(proBlockSchema),
  })
  .passthrough();

export type StarwindProManifest = z.infer<typeof proManifestSchema>;
export type StarwindProBlock = z.infer<typeof proBlockSchema>;

let cache: { manifest: StarwindProManifest; expiresAt: number } | null = null;

export async function getStarwindProManifest(): Promise<{
  manifest: StarwindProManifest;
  source: "network" | "cache";
}> {
  if (cache && Date.now() < cache.expiresAt) {
    return { manifest: cache.manifest, source: "cache" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(PRO_MANIFEST_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = proManifestSchema.parse(await response.json());
    cache = { manifest, expiresAt: Date.now() + CACHE_TTL_MS };
    return { manifest, source: "network" };
  } catch (error) {
    if (cache) {
      cache.expiresAt = Date.now() + RETRY_TTL_MS;
      return { manifest: cache.manifest, source: "cache" };
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function resetStarwindProManifestCache(): void {
  cache = null;
}

export const STARWIND_PRO_MANIFEST_URL = PRO_MANIFEST_URL;
