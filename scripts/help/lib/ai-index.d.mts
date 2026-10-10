export const INDEX_SCHEMA: number;
export function buildHelpIndex(catalog: any, registry: any, options?: { generatedOn?: string }): {
  schemaVersion: number;
  revision: string;
  appVersion: string;
  generatedOn: string;
  routes: { id: string; path: string; deepLink: boolean; public: boolean; platformOnly: boolean; menuPath: string[]; [k: string]: unknown }[];
  tasks: { id: string; routeId: string | null; articleId: string; [k: string]: unknown }[];
  chunks: { id: string; articleId: string; access: string; routeId: string | null; text: string; taskIds: string[]; [k: string]: unknown }[];
};
