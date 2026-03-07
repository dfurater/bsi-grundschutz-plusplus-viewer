export type RelationType = "related" | "required" | string;

export interface BuildInfo {
  buildTimestamp: string;
  appVersion: string;
  indexVersion: string;
  catalogFileName: string;
  catalogFileSha256: string;
  catalogFileSizeBytes: number;
}

export interface SourceReference {
  rel: string;
  href: string;
  targetUuid: string | null;
  title: string | null;
  description: string | null;
  resolvedHref: string | null;
  hashAlgorithm: string | null;
  hashValue: string | null;
}

export interface CatalogMeta {
  catalogId: string | null;
  title: string;
  version: string | null;
  lastModified: string | null;
  oscalVersion: string | null;
  remarks: string | null;
  props: Array<{ name: string | null; ns: string | null; value: string | null }>;
  publisher: {
    name: string;
    type: string | null;
    email: string | null;
    uuid: string | null;
  };
  sourceReferences: SourceReference[];
  stats: {
    topGroupCount: number;
    groupCount: number;
    controlCount: number;
    relationCount: number;
    controlsWithRelations: number;
  };
  groups: GroupNode[];
  groupTree: GroupTreeNode[];
  buildInfo: BuildInfo;
}

export interface GroupNode {
  id: string;
  title: string;
  altIdentifier: string | null;
  label: string | null;
  parentGroupId: string | null;
  topGroupId: string;
  pathIds: string[];
  pathTitles: string[];
  depth: number;
}

export interface GroupTreeNode {
  id: string;
  title: string;
  topGroupId: string;
  children: GroupTreeNode[];
}

export interface SearchDoc {
  docId: string;
  entityType: "control";
  id: string;
  title: string;
  class: string | null;
  topGroupId: string;
  parentGroupId: string | null;
  parentControlId: string | null;
  breadcrumbs: string[];
  groupPathIds: string[];
  groupPathTitles: string[];
  statementText: string;
  guidanceText: string;
  paramsText: string;
  propsText: string;
  facets: {
    topGroupId: string;
    groupId: string | null;
    secLevel: string | null;
    effortLevel: string | null;
    class: string | null;
    tags: string[];
    modalverbs: string[];
    targetObjects: string[];
    relationTypes: RelationType[];
    hasRelations: boolean;
  };
}

export interface RelationEdge {
  sourceControlId: string;
  targetControlId: string;
  relType: RelationType;
}

export interface RelationGraphNode {
  id: string;
  title: string;
  topGroupId: string | null;
  depth: 0 | 1 | 2;
}

export interface RelationGraphEdge extends RelationEdge {
  depth: 1 | 2;
  direction: "incoming" | "outgoing";
}

export interface RelationGraphPayload {
  focusId: string;
  hops: 1 | 2;
  nodes: RelationGraphNode[];
  edges: RelationGraphEdge[];
}

export interface ControlPart {
  id: string | null;
  name: string;
  prose: string;
  props: Array<{ name: string | null; ns: string | null; value: string | null }>;
}

export interface ControlParam {
  id: string | null;
  label: string | null;
  values: string[];
  props: Array<{ name: string | null; ns: string | null; value: string | null }>;
}

export interface ControlDetail {
  id: string;
  title: string;
  class: string | null;
  topGroupId: string;
  parentGroupId: string | null;
  parentControlId: string | null;
  controlDepth: number;
  groupPathIds: string[];
  groupPathTitles: string[];
  controlPathIds: string[];
  controlPathTitles: string[];
  pathIds: string[];
  breadcrumbs: string[];
  statementText: string;
  guidanceText: string;
  props: Array<{ name: string | null; ns: string | null; value: string | null }>;
  propsMap: Record<string, string[]>;
  params: ControlParam[];
  parts: ControlPart[];
  tags: string[];
  modalverbs: string[];
  targetObjects: string[];
  secLevel: string | null;
  effortLevel: string | null;
  links: Array<{ rel: string | null; href: string | null }>;
  relationsOutgoing: RelationEdge[];
  relationsIncoming: RelationEdge[];
}

export interface SearchFacets {
  topGroupId: string[];
  secLevel: string[];
  effortLevel: string[];
  class: string[];
  modalverbs: string[];
  targetObjects: string[];
  tags: string[];
  relationTypes: string[];
}

export interface SearchQuery {
  text: string;
  filters: {
    topGroupId: string[];
    groupId: string[];
    secLevel: string[];
    effortLevel: string[];
    class: string[];
    modalverbs: string[];
    targetObjects: string[];
    tags: string[];
    relationTypes: string[];
  };
  /* REQ: Clarification Pack §10 (UI 5.2 Sortierung) */
  sort:
    | "relevance"
    | "id-asc"
    | "id-desc"
    | "title-asc"
    | "title-desc"
    | "effort-asc"
    | "effort-desc";
  limit?: number;
  offset?: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  score: number;
  topGroupId: string;
  groupId: string | null;
  class: string | null;
  secLevel: string | null;
  effortLevel: string | null;
  modalverbs: string[];
  targetObjects: string[];
  tags: string[];
  snippet: string;
  breadcrumbs: string[];
}

export interface SearchResponse {
  total: number;
  items: SearchResultItem[];
  facets: Record<string, Array<{ value: string; count: number }>>;
  elapsedMs: number;
}

export interface CatalogIndexPayload {
  indexVersion: string;
  stats: CatalogMeta["stats"];
  facetOptions: SearchFacets;
  docs: SearchDoc[];
}
