import { z } from "zod";

export const STARWIND_FRAMEWORKS = ["astro", "react", "vue", "svelte"] as const;
export type StarwindFramework = (typeof STARWIND_FRAMEWORKS)[number];
export type StarwindFrameworkLabel = "Astro" | "React" | "Vue" | "Svelte";
export type StarwindMetadataSource = "network" | "cache" | "fallback";

export const STARWIND_FRAMEWORK_LABELS: Record<StarwindFramework, StarwindFrameworkLabel> = {
  astro: "Astro",
  react: "React",
  vue: "Vue",
  svelte: "Svelte",
};

export function isStarwindFramework(value: unknown): value is StarwindFramework {
  return typeof value === "string" && (STARWIND_FRAMEWORKS as readonly string[]).includes(value);
}
const AI_MANIFEST_URL = "https://starwind.dev/ai-manifest.json";
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const RETRY_TTL_MS = 60 * 1000;

const componentSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    description: z.string().default(""),
    installable: z.boolean(),
    // Unknown future targets (and runtimeCli-only targets such as legacy-astro) are dropped
    // instead of failing validation, so a newer manifest keeps serving the known frameworks.
    implementationTargets: z
      .array(z.string())
      .transform((targets) => targets.filter(isStarwindFramework)),
    publicImportPath: z.string(),
    installCommand: z.string(),
    updateCommand: z.string(),
    docsUrl: z.string().url(),
    markdownUrl: z.string().url(),
    aliases: z.array(z.string()).default([]),
    publicExports: z.array(z.string()).default([]),
    foundation: z.object({ type: z.string(), label: z.string() }).passthrough().optional(),
  })
  .passthrough();

const primitiveSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    label: z.string(),
    docsUrl: z.string().url(),
    markdownUrl: z.string().url(),
    aliases: z.array(z.string()).default([]),
    adapterUsage: z
      .array(
        z
          .object({
            framework: z.string(),
            packageName: z.string(),
            importSource: z.string(),
          })
          .passthrough(),
      )
      .default([])
      .transform((usages) =>
        usages.filter((usage): usage is typeof usage & { framework: StarwindFrameworkLabel } =>
          isStarwindFramework(usage.framework.toLowerCase()),
        ),
      ),
    runtime: z
      .object({
        factory: z.string(),
        importSource: z.string(),
        docsUrl: z.string().url(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const guideSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    description: z.string().default(""),
    docsUrl: z.string().url(),
    markdownUrl: z.string().url(),
    type: z.string(),
  })
  .passthrough();

const manifestSchema = z
  .object({
    version: z.literal(2),
    runtimeCli: z
      .object({
        configVersion: z.literal(2),
        implementationTargets: z.array(z.string()),
      })
      .passthrough(),
    components: z.array(componentSchema),
    guides: z.array(guideSchema),
    layeredDocs: z
      .object({
        primitives: z.array(primitiveSchema),
        runtime: z
          .object({
            docsUrl: z.string().url(),
            packageName: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export type StarwindManifest = z.infer<typeof manifestSchema>;
export type StarwindComponent = z.infer<typeof componentSchema>;
export type StarwindPrimitive = z.infer<typeof primitiveSchema>;
export type StarwindGuide = z.infer<typeof guideSchema>;

interface ManifestCache {
  manifest: StarwindManifest;
  expiresAt: number;
}

const FALLBACK_COMPONENTS = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "button-group",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "checkbox-group",
  "collapsible",
  "color-picker",
  "combobox",
  "context-menu",
  "dialog",
  "dropdown",
  "dropzone",
  "field",
  "form",
  "hover-card",
  "image",
  "input",
  "input-group",
  "input-otp",
  "item",
  "kbd",
  "label",
  "native-select",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "prose",
  "radio-group",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "theme-toggle",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
  "video",
] as const;

const FALLBACK_PRIMITIVES = [
  "accordion",
  "alert-dialog",
  "avatar",
  "button",
  "carousel",
  "chart",
  "checkbox",
  "checkbox-group",
  "collapsible",
  "color-picker",
  "combobox",
  "context-menu",
  "dialog",
  "drawer",
  "dropzone",
  "field",
  "fieldset",
  "form",
  "input",
  "input-otp",
  "menu",
  "navigation-menu",
  "popover",
  "preview-card",
  "progress",
  "radio",
  "radio-group",
  "scroll-area",
  "select",
  "sidebar",
  "slider",
  "switch",
  "tabs",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
] as const;

const FALLBACK_GUIDES = [
  ["getting-started", "Welcome to Starwind UI", "/docs/getting-started"],
  ["installation", "Installation", "/docs/getting-started/installation"],
  ["primitives", "Primitives", "/docs/getting-started/primitives"],
  ["theming", "Theming", "/docs/getting-started/theming"],
  ["dark-mode", "Dark Mode", "/docs/getting-started/dark-mode"],
  ["manual-setup", "Manual Setup", "/docs/getting-started/manual-setup"],
  ["migration", "Migration Guide", "/docs/getting-started/migration"],
  ["rtl", "RTL", "/docs/getting-started/rtl"],
  ["svelte", "Svelte Usage", "/docs/getting-started/svelte"],
  ["cli", "Command Line Interface", "/docs/getting-started/cli"],
  ["ai", "AI Integration", "/docs/getting-started/ai"],
  ["skills", "Skills", "/docs/getting-started/skills"],
  ["mcp", "MCP Server", "/docs/getting-started/mcp"],
  ["astro", "Astro Installation", "/docs/frameworks/astro"],
  ["astro-react", "Astro + React Installation", "/docs/frameworks/astro-react"],
  ["astro-vue", "Astro + Vue Installation", "/docs/frameworks/astro-vue"],
  ["astro-svelte", "Astro + Svelte Installation", "/docs/frameworks/astro-svelte"],
  ["vite-react", "Vite React Installation", "/docs/frameworks/vite-react"],
  ["nextjs", "Next.js Installation", "/docs/frameworks/nextjs"],
  ["tanstack-start", "TanStack Start Installation", "/docs/frameworks/tanstack-start"],
  ["react-router", "React Router Installation", "/docs/frameworks/react-router"],
  ["vite-vue", "Vite Vue Installation", "/docs/frameworks/vite-vue"],
  ["nuxt", "Nuxt Installation", "/docs/frameworks/nuxt"],
  ["quasar", "Quasar Installation", "/docs/frameworks/quasar"],
  [
    "laravel-inertia-vue",
    "Laravel Inertia Vue Installation",
    "/docs/frameworks/laravel-inertia-vue",
  ],
  ["vite-svelte", "Vite Svelte Installation", "/docs/frameworks/vite-svelte"],
  ["sveltekit", "SvelteKit Installation", "/docs/frameworks/sveltekit"],
] as const;

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part === "otp" ? "OTP" : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function buildFallbackManifest(): StarwindManifest {
  const components = FALLBACK_COMPONENTS.map((name) => {
    const title = titleFromSlug(name);
    const targets: StarwindFramework[] = name === "image" ? ["astro"] : [...STARWIND_FRAMEWORKS];
    return {
      name,
      title,
      description: "Starwind styled component",
      installable: true,
      implementationTargets: targets,
      publicImportPath: `@/components/starwind/${name}`,
      installCommand: `npx starwind@latest add ${name}`,
      updateCommand: `npx starwind@latest update ${name}`,
      docsUrl: `https://starwind.dev/docs/components/${name}/`,
      markdownUrl: `https://starwind.dev/docs/components/${name}.md`,
      aliases: [name, title],
      publicExports: [],
    };
  });
  const primitives = FALLBACK_PRIMITIVES.map((id) => ({
    id,
    title: `${titleFromSlug(id)} Primitive`,
    label: titleFromSlug(id),
    docsUrl: `https://starwind.dev/docs/primitives/${id}/`,
    markdownUrl: `https://starwind.dev/docs/primitives/${id}.md`,
    aliases: [id, titleFromSlug(id)],
    adapterUsage: STARWIND_FRAMEWORKS.map((framework) => ({
      framework: STARWIND_FRAMEWORK_LABELS[framework],
      packageName: `@starwind-ui/${framework}`,
      importSource: `@starwind-ui/${framework}/${id}`,
    })),
  }));
  const guides = FALLBACK_GUIDES.map(([name, title, path]) => ({
    name,
    title,
    description: "Starwind UI guide",
    docsUrl: `https://starwind.dev${path}/`,
    markdownUrl: `https://starwind.dev${path}.md`,
    type: "guide",
  }));
  return manifestSchema.parse({
    version: 2,
    runtimeCli: {
      configVersion: 2,
      implementationTargets: ["legacy-astro", ...STARWIND_FRAMEWORKS],
    },
    components,
    guides,
    layeredDocs: {
      primitives,
      runtime: {
        docsUrl: "https://starwind.dev/docs/runtime/",
        packageName: "@starwind-ui/runtime",
      },
    },
  });
}

const FALLBACK_MANIFEST: StarwindManifest = Object.freeze(buildFallbackManifest());
let manifestCache: ManifestCache | null = null;

function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

export async function getStarwindManifest(): Promise<{
  manifest: StarwindManifest;
  source: StarwindMetadataSource;
}> {
  if (manifestCache && Date.now() < manifestCache.expiresAt) {
    return { manifest: manifestCache.manifest, source: "cache" };
  }
  try {
    const response = await fetchWithTimeout(AI_MANIFEST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = manifestSchema.parse(await response.json());
    manifestCache = { manifest, expiresAt: Date.now() + CACHE_TTL_MS };
    return { manifest, source: "network" };
  } catch {
    if (manifestCache) {
      manifestCache.expiresAt = Date.now() + RETRY_TTL_MS;
      return { manifest: manifestCache.manifest, source: "cache" };
    }
    manifestCache = { manifest: FALLBACK_MANIFEST, expiresAt: Date.now() + RETRY_TTL_MS };
    return { manifest: FALLBACK_MANIFEST, source: "fallback" };
  }
}

export function resetStarwindManifestCache(): void {
  manifestCache = null;
}

export const STARWIND_AI_MANIFEST_URL = AI_MANIFEST_URL;
