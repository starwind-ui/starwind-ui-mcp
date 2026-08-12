import {
  getStarwindManifest,
  resetStarwindManifestCache,
  type StarwindFramework,
  type StarwindMetadataSource,
} from "./starwind_manifest.js";

export interface StandardComponentMetadata {
  slug: string;
  name: string;
  description: string;
  docsUrl: string;
  markdownUrl: string;
  implementationTargets: StarwindFramework[];
  publicImportPath: string;
  installCommand: string;
  aliases: string[];
}

export type StandardComponentMetadataSource = StarwindMetadataSource;

export async function getStandardComponentMetadata(): Promise<{
  components: StandardComponentMetadata[];
  source: StandardComponentMetadataSource;
}> {
  const { manifest, source } = await getStarwindManifest();
  return {
    source,
    components: manifest.components
      .filter((component) => component.installable)
      .map((component) => ({
        slug: component.name,
        name: component.title,
        description: component.description,
        docsUrl: component.docsUrl,
        markdownUrl: component.markdownUrl,
        implementationTargets: component.implementationTargets,
        publicImportPath: component.publicImportPath,
        installCommand: component.installCommand,
        aliases: component.aliases,
      })),
  };
}

export function resetStandardComponentMetadataCache(): void {
  resetStarwindManifestCache();
}
