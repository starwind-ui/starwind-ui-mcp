export interface StandardComponentMetadata {
  slug: string;
  name: string;
  docsUrl: string;
  markdownUrl: string;
}

export type StandardComponentMetadataSource = "network" | "cache" | "fallback";

interface ComponentMetadataCache {
  components: StandardComponentMetadata[];
  expiresAt: number;
}

const DOCS_BASE_URL = "https://starwind.dev/docs/components";
const LLMS_TXT_URL = "https://starwind.dev/llms.txt";
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

const FALLBACK_STANDARD_COMPONENTS: Array<{ slug: string; name: string }> = [
  { slug: "accordion", name: "Accordion" },
  { slug: "alert", name: "Alert" },
  { slug: "alert-dialog", name: "Alert Dialog" },
  { slug: "aspect-ratio", name: "Aspect Ratio" },
  { slug: "avatar", name: "Avatar" },
  { slug: "badge", name: "Badge" },
  { slug: "breadcrumb", name: "Breadcrumb" },
  { slug: "button", name: "Button" },
  { slug: "button-group", name: "Button Group" },
  { slug: "card", name: "Card" },
  { slug: "carousel", name: "Carousel" },
  { slug: "checkbox", name: "Checkbox" },
  { slug: "collapsible", name: "Collapsible" },
  { slug: "color-picker", name: "Color Picker" },
  { slug: "context-menu", name: "Context Menu" },
  { slug: "dialog", name: "Dialog" },
  { slug: "dropdown", name: "Dropdown" },
  { slug: "dropzone", name: "Dropzone" },
  { slug: "hover-card", name: "Hover Card" },
  { slug: "image", name: "Image" },
  { slug: "input", name: "Input" },
  { slug: "input-group", name: "Input Group" },
  { slug: "input-otp", name: "Input OTP" },
  { slug: "item", name: "Item" },
  { slug: "kbd", name: "Kbd" },
  { slug: "label", name: "Label" },
  { slug: "native-select", name: "Native Select" },
  { slug: "pagination", name: "Pagination" },
  { slug: "popover", name: "Popover" },
  { slug: "progress", name: "Progress" },
  { slug: "prose", name: "Prose" },
  { slug: "radio-group", name: "Radio Group" },
  { slug: "select", name: "Select" },
  { slug: "separator", name: "Separator" },
  { slug: "sheet", name: "Sheet" },
  { slug: "scroll-area", name: "Scroll Area" },
  { slug: "sidebar", name: "Sidebar" },
  { slug: "skeleton", name: "Skeleton" },
  { slug: "slider", name: "Slider" },
  { slug: "spinner", name: "Spinner" },
  { slug: "switch", name: "Switch" },
  { slug: "table", name: "Table" },
  { slug: "tabs", name: "Tabs" },
  { slug: "textarea", name: "Textarea" },
  { slug: "theme-toggle", name: "Theme Toggle" },
  { slug: "toast", name: "Toast" },
  { slug: "toggle", name: "Toggle" },
  { slug: "tooltip", name: "Tooltip" },
  { slug: "video", name: "Video" },
];

let componentMetadataCache: ComponentMetadataCache | null = null;

function toComponentMetadata(component: { slug: string; name: string }): StandardComponentMetadata {
  const docsUrl = `${DOCS_BASE_URL}/${component.slug}`;

  return {
    slug: component.slug,
    name: component.name,
    docsUrl,
    markdownUrl: `${docsUrl}.md`,
  };
}

export function getFallbackStandardComponentMetadata(): StandardComponentMetadata[] {
  return FALLBACK_STANDARD_COMPONENTS.map(toComponentMetadata);
}

export function parseStandardComponentMetadata(content: string): StandardComponentMetadata[] {
  const components: StandardComponentMetadata[] = [];
  const seen = new Set<string>();

  const sectionStart = content.indexOf(
    "Starwind UI currently includes the following installable components",
  );
  if (sectionStart === -1) {
    return [];
  }

  const afterSectionStart = content.slice(sectionStart);
  const nextSectionMatch = afterSectionStart.match(/\s##\s+(?!Installable Components)/);
  const installableSection = nextSectionMatch
    ? afterSectionStart.slice(0, nextSectionMatch.index)
    : afterSectionStart;

  const linkPattern =
    /- \[(?<name>[^\]]+)\]\(https:\/\/starwind\.dev\/docs\/components\/(?<slug>[a-z0-9-]+)\)/g;

  for (const match of installableSection.matchAll(linkPattern)) {
    if (!match.groups) {
      continue;
    }
    const { name, slug } = match.groups;
    if (seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    components.push(toComponentMetadata({ slug, name }));
  }

  return components;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getStandardComponentMetadata(): Promise<{
  components: StandardComponentMetadata[];
  source: StandardComponentMetadataSource;
}> {
  if (componentMetadataCache && Date.now() < componentMetadataCache.expiresAt) {
    return { components: componentMetadataCache.components, source: "cache" };
  }

  try {
    const response = await fetchWithTimeout(LLMS_TXT_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    const components = parseStandardComponentMetadata(content);
    if (components.length === 0) {
      throw new Error("No installable components parsed from llms.txt");
    }

    componentMetadataCache = {
      components,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return { components, source: "network" };
  } catch {
    return { components: getFallbackStandardComponentMetadata(), source: "fallback" };
  }
}

export function resetStandardComponentMetadataCache(): void {
  componentMetadataCache = null;
}
