export const root: string;
export function buildCatalog(): Promise<{ catalog: any; problems: { article: string; message: string; severity: string }[] }>;
