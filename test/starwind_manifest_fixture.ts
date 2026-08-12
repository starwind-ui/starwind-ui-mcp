export const aiManifestFixture = {
  version: 2,
  runtimeCli: {
    configVersion: 2,
    implementationTargets: ["legacy-astro", "astro", "react"],
  },
  components: [
    {
      name: "button",
      title: "Button",
      description: "An interactive button.",
      installable: true,
      implementationTargets: ["astro", "react"],
      publicImportPath: "@/components/starwind/button",
      installCommand: "npx starwind@latest add button",
      updateCommand: "npx starwind@latest update button",
      docsUrl: "https://starwind.dev/docs/components/button/",
      markdownUrl: "https://starwind.dev/docs/components/button.md",
      aliases: ["button", "cta"],
      publicExports: ["Button"],
      foundation: { type: "primitive", label: "Button Primitive" },
    },
    {
      name: "combobox",
      title: "Combobox",
      description: "A searchable selection component.",
      installable: true,
      implementationTargets: ["astro", "react"],
      publicImportPath: "@/components/starwind/combobox",
      installCommand: "npx starwind@latest add combobox",
      updateCommand: "npx starwind@latest update combobox",
      docsUrl: "https://starwind.dev/docs/components/combobox/",
      markdownUrl: "https://starwind.dev/docs/components/combobox.md",
      aliases: ["combobox", "autocomplete"],
      publicExports: ["Combobox"],
    },
    {
      name: "image",
      title: "Image",
      description: "An Astro image component.",
      installable: true,
      implementationTargets: ["astro"],
      publicImportPath: "@/components/starwind/image",
      installCommand: "npx starwind@latest add image",
      updateCommand: "npx starwind@latest update image",
      docsUrl: "https://starwind.dev/docs/components/image/",
      markdownUrl: "https://starwind.dev/docs/components/image.md",
      aliases: ["image"],
      publicExports: ["Image"],
    },
  ],
  guides: [
    {
      name: "migration",
      title: "Migration Guide",
      description: "Migrate to v3.",
      docsUrl: "https://starwind.dev/docs/getting-started/migration/",
      markdownUrl: "https://starwind.dev/docs/getting-started/migration.md",
      type: "guide",
    },
    {
      name: "vite-react",
      title: "Vite React Installation",
      description: "Install with Vite and React.",
      docsUrl: "https://starwind.dev/docs/frameworks/vite-react/",
      markdownUrl: "https://starwind.dev/docs/frameworks/vite-react.md",
      type: "guide",
    },
  ],
  layeredDocs: {
    primitives: [
      {
        id: "button",
        title: "Button Primitive",
        label: "Button",
        docsUrl: "https://starwind.dev/docs/primitives/button/",
        markdownUrl: "https://starwind.dev/docs/primitives/button.md",
        aliases: ["button", "pressable"],
        adapterUsage: [
          {
            framework: "Astro",
            packageName: "@starwind-ui/astro",
            importSource: "@starwind-ui/astro/button",
          },
          {
            framework: "React",
            packageName: "@starwind-ui/react",
            importSource: "@starwind-ui/react/button",
          },
        ],
        runtime: {
          factory: "createButton",
          importSource: "@starwind-ui/runtime/button",
          docsUrl: "https://starwind.dev/docs/runtime/#button",
        },
      },
      {
        id: "combobox",
        title: "Combobox Primitive",
        label: "Combobox",
        docsUrl: "https://starwind.dev/docs/primitives/combobox/",
        markdownUrl: "https://starwind.dev/docs/primitives/combobox.md",
        aliases: ["combobox"],
        adapterUsage: [
          {
            framework: "Astro",
            packageName: "@starwind-ui/astro",
            importSource: "@starwind-ui/astro/combobox",
          },
          {
            framework: "React",
            packageName: "@starwind-ui/react",
            importSource: "@starwind-ui/react/combobox",
          },
        ],
      },
    ],
    runtime: {
      docsUrl: "https://starwind.dev/docs/runtime/",
      packageName: "@starwind-ui/runtime",
    },
  },
};

export const proManifestFixture = {
  version: "1",
  baseUrl: "https://pro.starwind.dev",
  totalBlocks: 2,
  categories: ["hero", "pricing"],
  blocks: [
    {
      id: "hero-01",
      name: "Hero 01",
      description: "A marketing hero with a call to action.",
      categories: ["hero"],
      keywords: ["landing", "cta"],
      plan: "free",
      installCommand: "npx starwind@latest add @starwind-pro/hero-01 button",
      previewUrl: "/blocks/hero-01",
    },
    {
      id: "pricing-02",
      name: "Pricing 01",
      description: "A pricing comparison section.",
      categories: ["pricing"],
      keywords: ["plans"],
      plan: "pro",
      installCommand: "npx starwind@latest add @starwind-pro/pricing-02 badge button card switch",
      previewUrl: "/blocks/pricing-02",
    },
  ],
};

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function textResponse(value: string, status = 200): Response {
  return new Response(value, { status, headers: { "content-type": "text/plain" } });
}
