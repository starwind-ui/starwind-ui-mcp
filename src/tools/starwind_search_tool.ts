import { z } from "zod";

import { inspectStarwindProject } from "../utils/project_context.js";
import {
  getStarwindManifest,
  resetStarwindManifestCache,
  type StarwindComponent,
  type StarwindFramework,
  type StarwindPrimitive,
} from "../utils/starwind_manifest.js";
import { getProDiscovery, getProUpgrade } from "../utils/starwind_pro_guidance.js";
import {
  getStarwindProManifest,
  resetStarwindProManifestCache,
  type StarwindProBlock,
} from "../utils/starwind_pro_manifest.js";

export interface StarwindSearchArgs {
  query?: string;
  cwd?: string;
  surface?: "styled" | "primitive" | "all";
  framework?: StarwindFramework | "all";
  category?: string;
  plan?: "free" | "pro";
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeQuery(query?: string): string | null {
  const value = query?.trim().toLowerCase();
  return value || null;
}

function scoreText(query: string, exact: string[], searchable: string[]): number {
  if (exact.some((value) => value.toLowerCase() === query)) return 100;
  if (exact.some((value) => value.toLowerCase().includes(query))) return 60;
  if (searchable.some((value) => value.toLowerCase().includes(query))) return 25;
  return 0;
}

function searchStyled(
  components: StarwindComponent[],
  query: string | null,
  framework?: StarwindFramework,
) {
  if (!query) return [];
  return components
    .filter((item) => item.installable)
    .filter((item) => !framework || item.implementationTargets.includes(framework))
    .map((item) => ({
      item,
      score: scoreText(
        query,
        [item.name, item.title, ...item.aliases],
        [item.description, ...item.publicExports, item.foundation?.label ?? ""],
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => ({
      name: item.name,
      title: item.title,
      description: item.description,
      implementationTargets: item.implementationTargets,
      publicImportPath: item.publicImportPath,
      docsUrl: item.docsUrl,
      markdownUrl: item.markdownUrl,
      foundation: item.foundation ?? null,
      addCommand: `npx starwind@latest add ${item.name} --yes${framework ? ` --framework ${framework}` : ""}`,
    }));
}

function searchPrimitives(
  primitives: StarwindPrimitive[],
  query: string | null,
  framework?: StarwindFramework,
) {
  if (!query) return [];
  return primitives
    .filter(
      (item) =>
        !framework ||
        item.adapterUsage.some((usage) => usage.framework.toLowerCase() === framework),
    )
    .map((item) => ({
      item,
      score: scoreText(
        query,
        [item.id, item.title, item.label, ...item.aliases],
        [item.runtime?.factory ?? ""],
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .map(({ item }) => ({
      id: item.id,
      title: item.title,
      docsUrl: item.docsUrl,
      markdownUrl: item.markdownUrl,
      adapters: item.adapterUsage
        .filter((usage) => !framework || usage.framework.toLowerCase() === framework)
        .map((usage) => ({
          framework: usage.framework.toLowerCase(),
          packageName: usage.packageName,
          importSource: usage.importSource,
        })),
      runtime: item.runtime ?? null,
      addCommand: `npx starwind@latest primitives add ${item.id} --yes${framework ? ` --framework ${framework}` : ""}`,
    }));
}

function scorePro(block: StarwindProBlock, query: string): number {
  return scoreText(
    query,
    [block.id, block.name],
    [block.description, ...block.categories, ...block.keywords],
  );
}

function resolvePreviewUrl(previewUrl: string, baseUrl: string): string | null {
  try {
    return new URL(previewUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

export function resetStarwindSearchToolState(): void {
  resetStarwindProManifestCache();
  resetStarwindManifestCache();
}

export const starwindSearchTool = {
  name: "starwind_search",
  description:
    "Searches Starwind UI v3 styled components, Primitive adapters, and Starwind Pro blocks with framework-aware results.",
  inputSchema: {
    query: z.string().optional(),
    surface: z.enum(["styled", "primitive", "all"]).optional().describe("Defaults to all."),
    cwd: z.string().optional().describe("Project directory used to detect existing Pro setup."),
    framework: z.enum(["astro", "react", "all"]).optional(),
    plan: z.enum(["free", "pro"]).optional(),
    category: z.string().optional(),
    limit: z.number().optional().describe("Pro result limit; defaults to 20 and caps at 50."),
    offset: z.number().optional(),
  },
  outputSchema: {
    result: z.record(z.unknown()).describe("Structured layered Starwind search result."),
  },

  async handler(args: StarwindSearchArgs = {}): Promise<Record<string, any>> {
    const query = normalizeQuery(args.query);
    const surface = args.surface ?? "all";
    const framework = args.framework && args.framework !== "all" ? args.framework : undefined;
    const limit = Math.min(Math.max(1, Math.floor(args.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
    const offset = Math.max(0, Math.floor(args.offset ?? 0));
    const metadataPromise = getStarwindManifest();
    const project = inspectStarwindProject(args.cwd ?? process.cwd());
    const shouldSearchPro = surface !== "primitive" && framework !== "react";
    const proPromise = shouldSearchPro
      ? getStarwindProManifest()
          .then((value) => ({ ok: true as const, ...value }))
          .catch((error: unknown) => ({
            ok: false as const,
            error: error instanceof Error ? error.message : "Unknown Pro manifest error",
          }))
      : Promise.resolve({
          ok: false as const,
          error:
            framework === "react"
              ? "Starwind Pro blocks currently target Astro."
              : "Pro search is not part of primitive-only results.",
        });
    const [{ manifest, source }, pro] = await Promise.all([metadataPromise, proPromise]);

    const styledResults =
      surface === "primitive" ? [] : searchStyled(manifest.components, query, framework);
    const primitiveResults =
      surface === "styled"
        ? []
        : searchPrimitives(manifest.layeredDocs.primitives, query, framework);
    let proMatches: StarwindProBlock[] = [];
    if (pro.ok && (query || args.category || args.plan)) {
      proMatches = pro.manifest.blocks
        .filter((block) => !args.plan || block.plan === args.plan)
        .filter(
          (block) =>
            !args.category ||
            block.categories.some(
              (category) => category.toLowerCase() === args.category?.toLowerCase(),
            ),
        )
        .map((block) => ({ block, score: query ? scorePro(block, query) : 1 }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.block.id.localeCompare(b.block.id))
        .map(({ block }) => block);
    }
    const pagedPro = proMatches.slice(offset, offset + limit);
    const proResults = pro.ok
      ? pagedPro.map((block) => {
          const previewUrl = resolvePreviewUrl(block.previewUrl, pro.manifest.baseUrl);
          return {
            id: block.id,
            name: block.name,
            description: block.description,
            categories: block.categories,
            plan: block.plan,
            frameworkSupport: ["astro"],
            paidAuthorizationRequired: block.plan === "pro",
            ...(block.plan === "free"
              ? {
                  installCommand: block.installCommand.includes("--yes")
                    ? block.installCommand
                    : `${block.installCommand} --yes`,
                }
              : {
                  deferredInstallCommand: block.installCommand.includes("--yes")
                    ? block.installCommand
                    : `${block.installCommand} --yes`,
                }),
            ...(previewUrl ? { previewUrl } : {}),
          };
        })
      : [];
    const paidResults = proResults.filter((block) => block.plan === "pro");
    const totalMatches = styledResults.length + primitiveResults.length + proMatches.length;

    return {
      query,
      filters: {
        surface,
        framework: args.framework ?? "all",
        category: args.category ?? null,
        plan: args.plan ?? null,
      },
      totalMatches,
      styledComponents: {
        source,
        totalAvailable: manifest.components.filter((item) => item.installable).length,
        totalMatches: styledResults.length,
        results: styledResults,
      },
      primitives: {
        source,
        totalAvailable: manifest.layeredDocs.primitives.length,
        totalMatches: primitiveResults.length,
        results: primitiveResults,
      },
      proBlocks: {
        source: pro.ok ? pro.source : "unavailable",
        frameworkSupport: ["astro"],
        totalAvailable: pro.ok ? pro.manifest.totalBlocks : 0,
        totalMatches: proMatches.length,
        resultsReturned: proResults.length,
        availableCategories: pro.ok ? pro.manifest.categories : [],
        pagination: {
          limit,
          offset,
          hasMore: proResults.length > 0 && offset + proResults.length < proMatches.length,
        },
        results: proResults,
        ...(pro.ok && proResults.length && paidResults.length === 0
          ? { note: "Free Pro catalog blocks install after ordinary Starwind initialization." }
          : !pro.ok
            ? { note: pro.error }
            : {}),
      },
      ...(paidResults.length
        ? {
            proUpgrade: getProUpgrade({
              reason: `Paid authorization is required for: ${paidResults
                .map((block) => block.id)
                .join(", ")}.`,
              configured: project.proRegistryConfigured,
            }),
          }
        : shouldSearchPro && pro.ok
          ? { proDiscovery: getProDiscovery() }
          : {}),
      message:
        !query && !args.category && !args.plan
          ? "Provide a query, category, or plan to search Starwind UI."
          : totalMatches === 0
            ? "No matching Starwind items found."
            : undefined,
    };
  },
};
