export const SECURITY_BUDGETS = {
  maxCatalogFileSizeBytes: 8 * 1024 * 1024,
  maxRemoteJsonBytes: {
    catalogIndex: 3 * 1024 * 1024,
    catalogMeta: 1 * 1024 * 1024,
    profileLinks: 512 * 1024,
    catalogRegistry: 256 * 1024,
    detailChunk: 2 * 1024 * 1024
  },
  maxQueryChars: 180,
  maxQueryTokens: 24,
  maxTextChars: 24_000,
  maxShortTextChars: 512,
  maxArrayItems: 512,
  maxGroupCount: 2_000,
  maxControlCount: 5_000,
  maxRelationCount: 20_000,
  maxControlsPerChunk: 2_000,
  maxPropsPerControl: 256,
  maxParamsPerControl: 256,
  maxPartsPerControl: 256,
  maxLinksPerControl: 256,
  maxRelationsPerControl: 512,
  maxPathDepth: 64,
  searchTimeBudgetMs: 2_500,
  searchCheckpointInterval: 100
} as const;
