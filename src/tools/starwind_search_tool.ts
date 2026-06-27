import { z } from "zod";

import {
  getExistingProjectProSetupCommand,
  getProInitCommand,
} from "../utils/starwind_commands.js";
import {
  getStandardComponentMetadata,
  resetStandardComponentMetadataCache,
  type StandardComponentMetadata,
  type StandardComponentMetadataSource,
} from "../utils/starwind_component_metadata.js";

interface ManifestBlock {
  id: string;
  name: string;
  description: string;
  categories: string[];
  keywords: string[];
  plan: "free" | "pro";
  installCommand: string;
  previewUrl: string;
}

interface Manifest {
  $schema: string;
  name: string;
  version: string;
  generatedAt: string;
  baseUrl: string;
  totalBlocks: number;
  categories: string[];
  blocks: ManifestBlock[];
}

interface ManifestCache {
  data: Manifest;
  expiresAt: number;
}

export interface StarwindSearchArgs {
  query?: string;
  category?: string;
  plan?: "free" | "pro";
  limit?: number;
  offset?: number;
}

interface StandardComponentResult extends StandardComponentMetadata {
  addCommand: string;
}

interface ProBlockResult {
  id: string;
  name: string;
  description: string;
  categories: string[];
  plan: "free" | "pro";
  installCommand: string;
  previewUrl: string;
}

interface SearchPagination {
  limit: number;
  offset: number;
  hasMore: boolean;
}

type ProBlockSource = "network" | "cache" | "unavailable";

interface StarwindSearchResult {
  query: string | null;
  filters: {
    category: string | null;
    plan: "free" | "pro" | null;
  };
  totalMatches: number;
  standardComponents: {
    source: StandardComponentMetadataSource;
    totalAvailable: number;
    totalMatches: number;
    results: StandardComponentResult[];
  };
  proBlocks: {
    source: ProBlockSource;
    totalAvailable: number;
    totalMatches: number;
    resultsReturned: number;
    availableCategories: string[];
    pagination: SearchPagination;
    results: ProBlockResult[];
    error?: string;
  };
  proSetup?: {
    newProjectCommand: string;
    existingProjectCommand: string;
    note: string;
  };
  message?: string;
}

const MANIFEST_URL = "https://pro.starwind.dev/r/manifest.json";
const CACHE_TTL_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

let manifestCache: ManifestCache | null = null;

function normalizeQuery(query?: string): string | null {
  const normalized = query?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function getEffectiveLimit(limit?: number): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
}

function getEffectiveOffset(offset?: number): number {
  if (typeof offset !== "number" || Number.isNaN(offset)) {
    return 0;
  }

  return Math.max(0, Math.floor(offset));
}

async function getManifest(): Promise<{ manifest: Manifest; source: "network" | "cache" }> {
  if (manifestCache && Date.now() < manifestCache.expiresAt) {
    return { manifest: manifestCache.data, source: "cache" };
  }

  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Starwind Pro manifest: ${response.status} ${response.statusText}`,
    );
  }

  const manifest = (await response.json()) as Manifest;
  manifestCache = {
    data: manifest,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return { manifest, source: "network" };
}

function scoreStandardComponent(component: StandardComponentMetadata, query: string): number {
  const name = component.name.toLowerCase();
  const slug = component.slug.toLowerCase();

  if (slug === query || name === query) return 100;
  if (slug.includes(query) || name.includes(query)) return 50;
  if (query.includes(slug)) return 25;

  return 0;
}

function scoreProBlock(block: ManifestBlock, query: string): number {
  const name = block.name.toLowerCase();
  const id = block.id.toLowerCase();
  const description = block.description.toLowerCase();
  const categories = block.categories.map((category) => category.toLowerCase());
  const keywords = block.keywords.map((keyword) => keyword.toLowerCase());

  let score = 0;
  if (name === query) score += 100;
  else if (name.includes(query)) score += 50;
  if (id.includes(query)) score += 40;
  if (keywords.some((keyword) => keyword === query)) score += 30;
  if (keywords.some((keyword) => keyword.includes(query))) score += 20;
  if (categories.some((category) => category.includes(query))) score += 15;
  if (description.includes(query)) score += 10;

  return score;
}

function searchStandardComponents(
  components: StandardComponentMetadata[],
  query: string | null,
): StandardComponentResult[] {
  if (!query) {
    return [];
  }

  return components
    .map((component) => ({
      component,
      score: scoreStandardComponent(component, query),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.component.slug.localeCompare(b.component.slug))
    .map(({ component }) => ({
      ...component,
      addCommand: `npx starwind@latest add ${component.slug} --yes`,
    }));
}

function searchProBlocks(
  blocks: ManifestBlock[],
  query: string | null,
  filters: { category?: string; plan?: "free" | "pro" },
): ManifestBlock[] {
  let results = [...blocks];

  if (filters.category) {
    const category = filters.category.toLowerCase();
    results = results.filter((block) =>
      block.categories.some((blockCategory) => blockCategory.toLowerCase() === category),
    );
  }

  if (filters.plan) {
    results = results.filter((block) => block.plan === filters.plan);
  }

  if (!query) {
    return results;
  }

  return results
    .map((block) => ({ block, score: scoreProBlock(block, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.block.id.localeCompare(b.block.id))
    .map(({ block }) => block);
}

function toProBlockResult(block: ManifestBlock, baseUrl: string): ProBlockResult {
  return {
    id: block.id,
    name: block.name,
    description: block.description,
    categories: block.categories,
    plan: block.plan,
    installCommand: block.installCommand.includes("--yes")
      ? block.installCommand
      : `${block.installCommand} --yes`,
    previewUrl: `${baseUrl}${block.previewUrl}`,
  };
}

export function resetStarwindSearchToolState(): void {
  manifestCache = null;
  resetStandardComponentMetadataCache();
}

export const starwindSearchTool = {
  name: "starwind_search",
  description:
    "Searches Starwind UI standard components and Starwind Pro blocks by query. Mirrors the Starwind CLI search shape with Pro block plan/category filters plus limit and offset pagination.",
  inputSchema: {
    query: z.string().optional().describe("Search query for components and Pro blocks."),
    plan: z.enum(["free", "pro"]).optional().describe("Filter Starwind Pro blocks by plan type."),
    category: z.string().optional().describe("Filter Starwind Pro blocks by category."),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of Pro blocks to return. Defaults to 20, maximum 50."),
    offset: z
      .number()
      .optional()
      .describe("Offset for paginating Pro block results. Defaults to 0."),
  },
  handler: async (args: StarwindSearchArgs = {}): Promise<StarwindSearchResult> => {
    const query = normalizeQuery(args.query);
    const limit = getEffectiveLimit(args.limit);
    const offset = getEffectiveOffset(args.offset);
    const isOverviewRequest = !query && !args.category && !args.plan;

    const componentMetadataPromise = getStandardComponentMetadata();
    const manifestPromise = getManifest()
      .then((value) => ({ ok: true as const, ...value }))
      .catch((error: unknown) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : "Unknown Starwind Pro manifest error",
      }));
    const { components, source: componentSource } = await componentMetadataPromise;
    const manifestResult = await manifestPromise;

    const standardResults = searchStandardComponents(components, query);
    const proMatches =
      !manifestResult.ok || isOverviewRequest
        ? []
        : searchProBlocks(manifestResult.manifest.blocks, query, {
            category: args.category,
            plan: args.plan,
          });
    const pagedProMatches = proMatches.slice(offset, offset + limit);
    const proResults = manifestResult.ok
      ? pagedProMatches.map((block) => toProBlockResult(block, manifestResult.manifest.baseUrl))
      : [];
    const totalMatches = standardResults.length + proMatches.length;

    const result: StarwindSearchResult = {
      query,
      filters: {
        category: args.category || null,
        plan: args.plan || null,
      },
      totalMatches,
      standardComponents: {
        source: componentSource,
        totalAvailable: components.length,
        totalMatches: standardResults.length,
        results: standardResults,
      },
      proBlocks: {
        source: manifestResult.ok ? manifestResult.source : "unavailable",
        totalAvailable: manifestResult.ok ? manifestResult.manifest.totalBlocks : 0,
        totalMatches: proMatches.length,
        resultsReturned: proResults.length,
        availableCategories: manifestResult.ok ? manifestResult.manifest.categories : [],
        pagination: {
          limit,
          offset,
          hasMore: offset + proResults.length < proMatches.length,
        },
        results: proResults,
        ...(!manifestResult.ok ? { error: manifestResult.error } : {}),
      },
    };

    if (isOverviewRequest) {
      result.message =
        "Provide a query, category, or plan to search Starwind components and Pro blocks.";
    } else if (totalMatches === 0) {
      result.message = manifestResult.ok
        ? "No Starwind components or Pro blocks found. Try a broader query or remove filters."
        : "No Starwind standard components found. Starwind Pro block search is temporarily unavailable.";
    }

    if (proResults.length > 0) {
      result.proSetup = {
        newProjectCommand: getProInitCommand("npx"),
        existingProjectCommand: getExistingProjectProSetupCommand("npx"),
        note: "For a new project, initialize with --pro. For an already initialized Starwind UI project, run setup once before adding Pro blocks.",
      };
    }

    return result;
  },
};
