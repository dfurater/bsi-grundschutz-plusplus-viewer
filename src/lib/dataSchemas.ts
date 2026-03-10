import { z } from "zod";
import { SECURITY_BUDGETS } from "./securityBudgets";

const shortString = z.string().max(SECURITY_BUDGETS.maxShortTextChars);
const mediumString = z.string().max(2_000);
const longString = z.string().max(SECURITY_BUDGETS.maxTextChars);
const boundedArray = <T extends z.ZodTypeAny>(schema: T, max: number = SECURITY_BUDGETS.maxArrayItems) =>
  z.array(schema).max(max);

const NullableShortString = shortString.nullable();
const NullableMediumString = mediumString.nullable();
const NullableLongString = longString.nullable();

const BuildInfoSchema = z
  .object({
    buildTimestamp: shortString,
    appVersion: shortString,
    indexVersion: shortString,
    catalogFileName: shortString,
    catalogFileSha256: z.string().regex(/^[a-f0-9]{64}$/i),
    catalogFileSizeBytes: z.number().int().nonnegative().max(SECURITY_BUDGETS.maxCatalogFileSizeBytes)
  })
  .strict();

const SourceReferenceSchema = z
  .object({
    rel: shortString,
    href: mediumString,
    targetUuid: NullableShortString,
    title: NullableMediumString,
    description: NullableLongString,
    resolvedHref: NullableMediumString,
    hashAlgorithm: NullableShortString,
    hashValue: NullableMediumString
  })
  .strict();

const GroupNodeSchema = z
  .object({
    id: shortString,
    title: mediumString,
    altIdentifier: NullableShortString,
    label: NullableShortString,
    parentGroupId: NullableShortString,
    topGroupId: shortString,
    pathIds: boundedArray(shortString, SECURITY_BUDGETS.maxPathDepth),
    pathTitles: boundedArray(mediumString, SECURITY_BUDGETS.maxPathDepth),
    depth: z.number().int().min(1).max(SECURITY_BUDGETS.maxPathDepth)
  })
  .strict();

const GroupTreeNodeSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      id: shortString,
      title: mediumString,
      topGroupId: shortString,
      children: z.array(GroupTreeNodeSchema)
    })
    .strict()
);

const StatsSchema = z
  .object({
    topGroupCount: z.number().int().nonnegative().max(SECURITY_BUDGETS.maxGroupCount),
    groupCount: z.number().int().nonnegative().max(SECURITY_BUDGETS.maxGroupCount),
    controlCount: z.number().int().nonnegative().max(SECURITY_BUDGETS.maxControlCount),
    relationCount: z.number().int().nonnegative().max(SECURITY_BUDGETS.maxRelationCount),
    controlsWithRelations: z.number().int().nonnegative().max(SECURITY_BUDGETS.maxControlCount)
  })
  .strict();

const SearchDocSchema = z
  .object({
    docId: shortString,
    entityType: z.literal("control"),
    id: shortString,
    title: mediumString,
    class: NullableShortString,
    topGroupId: shortString,
    parentGroupId: NullableShortString,
    parentControlId: NullableShortString,
    breadcrumbs: boundedArray(mediumString, SECURITY_BUDGETS.maxPathDepth * 2),
    groupPathIds: boundedArray(shortString, SECURITY_BUDGETS.maxPathDepth),
    groupPathTitles: boundedArray(mediumString, SECURITY_BUDGETS.maxPathDepth),
    statementText: longString,
    guidanceText: longString,
    paramsText: longString,
    propsText: longString,
    facets: z
      .object({
        topGroupId: shortString,
        groupId: NullableShortString,
        secLevel: NullableShortString,
        effortLevel: NullableShortString,
        class: NullableShortString,
        tags: boundedArray(shortString),
        modalverbs: boundedArray(shortString),
        targetObjects: boundedArray(mediumString),
        relationTypes: boundedArray(shortString),
        hasRelations: z.boolean()
      })
      .strict()
  })
  .strict();

const SearchFacetsSchema = z
  .object({
    topGroupId: boundedArray(shortString),
    secLevel: boundedArray(shortString),
    effortLevel: boundedArray(shortString),
    class: boundedArray(shortString),
    modalverbs: boundedArray(shortString),
    targetObjects: boundedArray(mediumString),
    tags: boundedArray(shortString),
    relationTypes: boundedArray(shortString)
  })
  .strict();

const RelationEdgeSchema = z
  .object({
    sourceControlId: shortString,
    targetControlId: shortString,
    relType: shortString
  })
  .strict();

const ControlPropSchema = z
  .object({
    name: NullableShortString,
    ns: NullableMediumString,
    value: NullableLongString
  })
  .strict();

const ControlParamSchema = z
  .object({
    id: NullableShortString,
    label: NullableMediumString,
    values: boundedArray(mediumString),
    props: boundedArray(ControlPropSchema, SECURITY_BUDGETS.maxPropsPerControl)
  })
  .strict();

const ControlPartSchema = z
  .object({
    id: NullableShortString,
    name: shortString,
    prose: longString,
    props: boundedArray(ControlPropSchema, SECURITY_BUDGETS.maxPropsPerControl)
  })
  .strict();

const ControlDetailSchema = z
  .object({
    id: shortString,
    title: mediumString,
    class: NullableShortString,
    topGroupId: shortString,
    parentGroupId: NullableShortString,
    parentControlId: NullableShortString,
    controlDepth: z.number().int().min(1).max(SECURITY_BUDGETS.maxPathDepth),
    groupPathIds: boundedArray(shortString, SECURITY_BUDGETS.maxPathDepth),
    groupPathTitles: boundedArray(mediumString, SECURITY_BUDGETS.maxPathDepth),
    controlPathIds: boundedArray(shortString, SECURITY_BUDGETS.maxPathDepth),
    controlPathTitles: boundedArray(mediumString, SECURITY_BUDGETS.maxPathDepth),
    pathIds: boundedArray(shortString, SECURITY_BUDGETS.maxPathDepth * 2),
    breadcrumbs: boundedArray(mediumString, SECURITY_BUDGETS.maxPathDepth * 2),
    statementText: longString,
    guidanceText: longString,
    props: boundedArray(ControlPropSchema, SECURITY_BUDGETS.maxPropsPerControl),
    propsMap: z.record(shortString, boundedArray(longString)),
    params: boundedArray(ControlParamSchema, SECURITY_BUDGETS.maxParamsPerControl),
    parts: boundedArray(ControlPartSchema, SECURITY_BUDGETS.maxPartsPerControl),
    tags: boundedArray(shortString),
    modalverbs: boundedArray(shortString),
    targetObjects: boundedArray(mediumString),
    secLevel: NullableShortString,
    effortLevel: NullableShortString,
    links: boundedArray(
      z
        .object({
          rel: NullableShortString,
          href: NullableMediumString
        })
        .strict(),
      SECURITY_BUDGETS.maxLinksPerControl
    ),
    relationsOutgoing: boundedArray(RelationEdgeSchema, SECURITY_BUDGETS.maxRelationsPerControl),
    relationsIncoming: boundedArray(RelationEdgeSchema, SECURITY_BUDGETS.maxRelationsPerControl)
  })
  .strict();

export const CatalogMetaSchema = z
  .object({
    catalogId: NullableShortString,
    title: mediumString,
    version: NullableShortString,
    lastModified: NullableShortString,
    oscalVersion: NullableShortString,
    remarks: NullableLongString,
    props: boundedArray(ControlPropSchema, SECURITY_BUDGETS.maxPropsPerControl),
    publisher: z
      .object({
        name: mediumString,
        type: NullableShortString,
        email: NullableMediumString,
        uuid: NullableShortString
      })
      .strict(),
    sourceReferences: boundedArray(SourceReferenceSchema),
    stats: StatsSchema,
    groups: z.array(GroupNodeSchema).max(SECURITY_BUDGETS.maxGroupCount),
    groupTree: z.array(GroupTreeNodeSchema).max(SECURITY_BUDGETS.maxGroupCount),
    buildInfo: BuildInfoSchema
  })
  .strict();

export const CatalogIndexSchema = z
  .object({
    indexVersion: shortString,
    stats: StatsSchema,
    facetOptions: SearchFacetsSchema,
    docs: z.array(SearchDocSchema).max(SECURITY_BUDGETS.maxControlCount)
  })
  .strict();

export const DetailChunkSchema = z
  .object({
    controls: z.record(shortString, ControlDetailSchema)
  })
  .strict()
  .superRefine((value, context) => {
    const controlCount = Object.keys(value.controls).length;
    if (controlCount > SECURITY_BUDGETS.maxControlsPerChunk) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Detail-Chunk überschreitet Budget (${controlCount} > ${SECURITY_BUDGETS.maxControlsPerChunk}).`
      });
    }
  });

export const NormalizedCatalogSchema = z
  .object({
    meta: z
      .object({
        catalogId: NullableShortString,
        title: mediumString,
        version: NullableShortString,
        lastModified: NullableShortString,
        oscalVersion: NullableShortString,
        remarks: NullableLongString,
        props: boundedArray(ControlPropSchema, SECURITY_BUDGETS.maxPropsPerControl),
        publisher: z
          .object({
            name: mediumString,
            type: NullableShortString,
            email: NullableMediumString,
            uuid: NullableShortString
          })
          .strict(),
        sourceReferences: boundedArray(SourceReferenceSchema)
      })
      .strict(),
    groups: z.array(GroupNodeSchema).max(SECURITY_BUDGETS.maxGroupCount),
    groupTree: z.array(GroupTreeNodeSchema).max(SECURITY_BUDGETS.maxGroupCount),
    docs: z.array(SearchDocSchema).max(SECURITY_BUDGETS.maxControlCount),
    detailsByTopGroup: z.record(shortString, DetailChunkSchema),
    stats: StatsSchema
  })
  .strict();

export type CatalogIndexPayloadValidated = z.infer<typeof CatalogIndexSchema>;
export type CatalogMetaValidated = z.infer<typeof CatalogMetaSchema>;
export type DetailChunkValidated = z.infer<typeof DetailChunkSchema>;
