/**
 * Documentation Tool for the MCP Server
 * Provides main documentation links for Starwind UI
 */

/**
 * Interface for documentation tool arguments
 */
export interface DocumentationArgs {
  /** Type of documentation to retrieve (defaults to 'overview') */
  type?:
    | "overview"
    | "getting-started"
    | "cli"
    | "installation"
    | "theming"
    | "components"
    | "full";
  /** Specific component to get documentation for (only used when type is 'components') */
  component?: string;
}

// Documentation URLs
const DOCS_URLS = {
  home: "https://starwind.dev/",
  "getting-started": "https://starwind.dev/docs/getting-started/",
  cli: "https://starwind.dev/docs/getting-started/cli/",
  installation: "https://starwind.dev/docs/getting-started/installation/",
  theming: "https://starwind.dev/docs/getting-started/theming/",
  components: "https://starwind.dev/docs/components/",
  full: "https://starwind.dev/llms-full.txt",
};

// Available components with their documentation URLs
const COMPONENTS = {
  accordion: "https://starwind.dev/docs/components/accordion",
  alert: "https://starwind.dev/docs/components/alert",
  avatar: "https://starwind.dev/docs/components/avatar",
  badge: "https://starwind.dev/docs/components/badge",
  breadcrumb: "https://starwind.dev/docs/components/breadcrumb",
  button: "https://starwind.dev/docs/components/button",
  card: "https://starwind.dev/docs/components/card",
  checkbox: "https://starwind.dev/docs/components/checkbox",
  dialog: "https://starwind.dev/docs/components/dialog",
  dropdown: "https://starwind.dev/docs/components/dropdown",
  dropzone: "https://starwind.dev/docs/components/dropzone",
  input: "https://starwind.dev/docs/components/input",
  label: "https://starwind.dev/docs/components/label",
  pagination: "https://starwind.dev/docs/components/pagination",
  progress: "https://starwind.dev/docs/components/progress",
  "radio-group": "https://starwind.dev/docs/components/radio-group",
  select: "https://starwind.dev/docs/components/select",
  skeleton: "https://starwind.dev/docs/components/skeleton",
  switch: "https://starwind.dev/docs/components/switch",
  table: "https://starwind.dev/docs/components/table",
  tabs: "https://starwind.dev/docs/components/tabs",
  textarea: "https://starwind.dev/docs/components/textarea",
  tooltip: "https://starwind.dev/docs/components/tooltip",
};

// Define the type for component names
type ComponentName = keyof typeof COMPONENTS;

/**
 * Documentation tool definition
 */
export const documentationTool = {
  name: "get_documentation",
  description: "Returns documentation links for Starwind UI",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Type of documentation to retrieve (defaults to overview)",
        enum: [
          "overview",
          "getting-started",
          "cli",
          "installation",
          "theming",
          "components",
          "full",
        ],
      },
      component: {
        type: "string",
        description:
          "Specific component to get documentation for (only used when type is components)",
      },
    },
    required: [],
  },
  handler: async (args: DocumentationArgs = {}) => {
    const docType = args.type || "overview";

    // Base documentation response
    const response: Record<string, any> = {
      timestamp: new Date().toISOString(),
    };

    // If requesting component-specific documentation
    if (docType === "components" && args.component) {
      const componentName = args.component.toLowerCase();

      // Check if the component name is a valid key in COMPONENTS
      if (componentName in COMPONENTS && isValidComponentName(componentName)) {
        response.documentationType = "component";
        response.component = componentName;
        response.url = COMPONENTS[componentName as ComponentName];
        response.importExample = `import { ${componentName.charAt(0).toUpperCase() + componentName.slice(1)} } from "@/components/starwind/${componentName}";`;
      } else {
        response.documentationType = "components";
        response.url = DOCS_URLS.components;
        response.availableComponents = Object.keys(COMPONENTS);
        response.message = `Component '${args.component}' not found. Please choose from the available components list.`;
      }
    }
    // If requesting general documentation
    else {
      response.documentationType = docType;

      // For overview, provide all main links
      if (docType === "overview") {
        response.mainLinks = {
          home: DOCS_URLS.home,
          gettingStarted: DOCS_URLS["getting-started"],
          cli: DOCS_URLS.cli,
          installation: DOCS_URLS.installation,
          theming: DOCS_URLS.theming,
          components: DOCS_URLS.components,
          fullReference: DOCS_URLS.full,
        };
        response.description =
          "Starwind UI is an open-source component library for Astro projects, styled with Tailwind CSS v4. It provides accessible, customizable components that can be added directly to your projects.";
        response.availableComponents = Object.keys(COMPONENTS);
      }
      // For components listing
      else if (docType === "components") {
        response.url = DOCS_URLS.components;
        response.components = Object.entries(COMPONENTS).map(([name, url]) => ({
          name,
          url,
        }));
        response.importPattern =
          'import { ComponentName } from "@/components/starwind/component-name";';
      }
      // For other doc types
      else {
        response.url = DOCS_URLS[docType] || DOCS_URLS.home;
      }
    }

    return response;
  },
};

/**
 * Type guard to check if a string is a valid component name
 * @param key - The key to check
 * @returns True if the key is a valid component name
 */
function isValidComponentName(key: string): key is ComponentName {
  return key in COMPONENTS;
}
