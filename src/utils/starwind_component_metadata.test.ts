import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getStandardComponentMetadata,
  parseStandardComponentMetadata,
  resetStandardComponentMetadataCache,
} from "./starwind_component_metadata.js";

const LLMS_TXT = `# Starwind UI - AI Reference Guide

## Installable Components and Documentation

Starwind UI currently includes the following installable components:

- [Button](https://starwind.dev/docs/components/button)
- [Color Picker](https://starwind.dev/docs/components/color-picker)
- [Input Group](https://starwind.dev/docs/components/input-group)
- [Select](https://starwind.dev/docs/components/select)

## Documented Select Patterns

- Combobox: Select plus \`SelectSearch\` pattern documented at https://starwind.dev/docs/components/combobox. Install with \`starwind add select\`; there is no separate \`combobox\` install target.
`;

const COMPACT_LLMS_TXT =
  "# Starwind UI - AI Reference Guide ## Installable Components and Documentation Starwind UI currently includes the following installable components: - [Button](https://starwind.dev/docs/components/button) - [Color Picker](https://starwind.dev/docs/components/color-picker) - [Input Group](https://starwind.dev/docs/components/input-group) - [Native Select](https://starwind.dev/docs/components/native-select) - [Kbd](https://starwind.dev/docs/components/kbd) ## Documented Select Patterns - Combobox: Select plus `SelectSearch` pattern documented at https://starwind.dev/docs/components/combobox. Install with `starwind add select`; there is no separate `combobox` install target.";

describe("Starwind standard component metadata", () => {
  afterEach(() => {
    resetStandardComponentMetadataCache();
    vi.unstubAllGlobals();
  });

  it("parses installable component metadata from llms.txt without documented patterns", () => {
    const components = parseStandardComponentMetadata(LLMS_TXT);

    expect(components).toEqual([
      {
        slug: "button",
        name: "Button",
        docsUrl: "https://starwind.dev/docs/components/button",
        markdownUrl: "https://starwind.dev/docs/components/button.md",
      },
      {
        slug: "color-picker",
        name: "Color Picker",
        docsUrl: "https://starwind.dev/docs/components/color-picker",
        markdownUrl: "https://starwind.dev/docs/components/color-picker.md",
      },
      {
        slug: "input-group",
        name: "Input Group",
        docsUrl: "https://starwind.dev/docs/components/input-group",
        markdownUrl: "https://starwind.dev/docs/components/input-group.md",
      },
      {
        slug: "select",
        name: "Select",
        docsUrl: "https://starwind.dev/docs/components/select",
        markdownUrl: "https://starwind.dev/docs/components/select.md",
      },
    ]);
    expect(components.map((component) => component.slug)).not.toContain("combobox");
  });

  it("parses compact production-style llms.txt content", () => {
    const components = parseStandardComponentMetadata(COMPACT_LLMS_TXT);
    const slugs = components.map((component) => component.slug);

    expect(slugs).toEqual(["button", "color-picker", "input-group", "native-select", "kbd"]);
    expect(slugs).not.toContain("combobox");
  });

  it("uses refreshed fallback metadata when live docs cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await getStandardComponentMetadata();
    const slugs = result.components.map((component) => component.slug);

    expect(result.source).toBe("fallback");
    expect(slugs).toEqual([
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
      "checkbox",
      "collapsible",
      "color-picker",
      "context-menu",
      "dialog",
      "dropdown",
      "dropzone",
      "hover-card",
      "image",
      "input",
      "input-group",
      "input-otp",
      "item",
      "kbd",
      "label",
      "native-select",
      "pagination",
      "popover",
      "progress",
      "prose",
      "radio-group",
      "select",
      "separator",
      "sheet",
      "scroll-area",
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
      "tooltip",
      "video",
    ]);
    expect(slugs).not.toContain("combobox");
  });

  it("falls back when the live docs fetch times out", async () => {
    vi.useFakeTimers();

    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url: string, init?: { signal?: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(new Error("aborted"));
              });
            }),
        ),
      );

      const resultPromise = getStandardComponentMetadata();
      await vi.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;

      expect(result.source).toBe("fallback");
      expect(result.components.map((component) => component.slug)).toContain("button");
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns live metadata and then cached metadata after a successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(LLMS_TXT),
      }),
    );

    const first = await getStandardComponentMetadata();
    const second = await getStandardComponentMetadata();

    expect(first.source).toBe("network");
    expect(second.source).toBe("cache");
    expect(second.components).toEqual(first.components);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
