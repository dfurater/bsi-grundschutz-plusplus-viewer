function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstValue(values, fallback = "") {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }
  const value = values[0];
  return value == null ? fallback : String(value);
}

function collectProps(props) {
  const map = {};
  for (const prop of asArray(props)) {
    const name = String(prop?.name ?? "").trim();
    if (!name) {
      continue;
    }
    const value = prop?.value == null ? "" : String(prop.value);
    if (!map[name]) {
      map[name] = [];
    }
    map[name].push(value);
  }
  return map;
}

function splitTags(values) {
  const tags = [];
  for (const value of values) {
    for (const token of String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)) {
      tags.push(token);
    }
  }
  return Array.from(new Set(tags));
}

function extractPartText(parts, partName) {
  return asArray(parts)
    .filter((part) => part?.name === partName)
    .map((part) => String(part?.prose ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function extractPublisher(metadata) {
  const parties = asArray(metadata?.parties);
  const partyByUuid = new Map(parties.map((party) => [party?.uuid, party]));
  const responsibleParties = asArray(metadata?.["responsible-parties"]);
  const creatorRole = responsibleParties.find((item) => item?.["role-id"] === "creator");
  const creatorParty = creatorRole?.["party-uuids"]?.[0]
    ? partyByUuid.get(creatorRole["party-uuids"][0])
    : parties[0];

  return {
    name: creatorParty?.name ?? "Unbekannt",
    type: creatorParty?.type ?? null,
    email: asArray(creatorParty?.["email-addresses"])[0] ?? null,
    uuid: creatorParty?.uuid ?? null
  };
}

function resolveSourceReferences(catalog) {
  const metadata = catalog?.metadata ?? {};
  const resources = asArray(catalog?.["back-matter"]?.resources);
  const resourceByUuid = new Map(resources.map((resource) => [resource?.uuid, resource]));

  return asArray(metadata?.links).map((link) => {
    const href = String(link?.href ?? "");
    const rel = String(link?.rel ?? "");
    const targetUuid = href.startsWith("#") ? href.slice(1) : null;
    const resource = targetUuid ? resourceByUuid.get(targetUuid) : null;
    const rlink = asArray(resource?.rlinks)[0] ?? null;

    return {
      rel,
      href,
      targetUuid,
      title: resource?.title ?? null,
      description: resource?.description ?? null,
      resolvedHref: rlink?.href ?? null,
      hashAlgorithm: asArray(rlink?.hashes)[0]?.algorithm ?? null,
      hashValue: asArray(rlink?.hashes)[0]?.value ?? null
    };
  });
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mapPart(part) {
  return {
    id: part?.id ?? null,
    name: part?.name ?? "unknown",
    prose: String(part?.prose ?? ""),
    props: asArray(part?.props).map((prop) => ({
      name: prop?.name ?? null,
      ns: prop?.ns ?? null,
      value: prop?.value ?? null
    }))
  };
}

function mapParam(param) {
  return {
    id: param?.id ?? null,
    label: param?.label ?? null,
    values: asArray(param?.values).map((value) => String(value)),
    props: asArray(param?.props).map((prop) => ({
      name: prop?.name ?? null,
      ns: prop?.ns ?? null,
      value: prop?.value ?? null
    }))
  };
}

export function normalizeCatalog(input) {
  const catalog = input?.catalog ?? input;
  if (!catalog || !Array.isArray(catalog.groups)) {
    throw new Error("Ungueltiges OSCAL-Katalogformat: catalog.groups fehlt.");
  }

  const metadata = catalog.metadata ?? {};
  const catalogMeta = {
    catalogId: catalog.uuid ?? null,
    title: metadata.title ?? "Unbenannter Katalog",
    version: metadata.version ?? null,
    lastModified: metadata["last-modified"] ?? null,
    oscalVersion: metadata["oscal-version"] ?? null,
    remarks: metadata.remarks ?? null,
    props: asArray(metadata.props).map((prop) => ({
      name: prop?.name ?? null,
      ns: prop?.ns ?? null,
      value: prop?.value ?? null
    })),
    publisher: extractPublisher(metadata),
    sourceReferences: resolveSourceReferences(catalog)
  };

  const groupNodes = [];
  const groupTree = [];
  const docs = [];
  const detailsByTopGroup = {};
  const detailsById = new Map();
  const relationEdges = [];

  function pushGroupNode(group, parentGroupId, pathIds, pathTitles, depth, topGroupId) {
    const propsMap = collectProps(group?.props);
    const node = {
      id: String(group?.id ?? "").trim(),
      title: String(group?.title ?? "").trim() || "Unbenannte Gruppe",
      altIdentifier: firstValue(propsMap["alt-identifier"], null),
      label: firstValue(propsMap.label, null),
      parentGroupId,
      topGroupId,
      pathIds,
      pathTitles,
      depth
    };
    groupNodes.push(node);
    return node;
  }

  function ensureTopGroupBucket(topGroupId) {
    if (!detailsByTopGroup[topGroupId]) {
      detailsByTopGroup[topGroupId] = { controls: {} };
    }
    return detailsByTopGroup[topGroupId];
  }

  function processControl({
    control,
    parentGroupId,
    parentControlId,
    groupPathIds,
    groupPathTitles,
    controlPathIds,
    controlPathTitles,
    topGroupId,
    controlDepth
  }) {
    const id = String(control?.id ?? "").trim();
    if (!id) {
      return;
    }

    const title = String(control?.title ?? "").trim() || "Untitled Control";
    const props = asArray(control?.props);
    const params = asArray(control?.params);
    const parts = asArray(control?.parts);
    const links = asArray(control?.links);

    const propsMap = collectProps(props);
    const partPropsMap = collectProps(parts.flatMap((part) => asArray(part?.props)));
    const tags = splitTags(propsMap.tags ?? []);
    const modalverbs = uniq(partPropsMap.modalverb ?? []);
    const targetObjects = splitTags(partPropsMap.target_objects ?? []);

    const statementText = extractPartText(parts, "statement");
    const guidanceText = extractPartText(parts, "guidance");
    const paramsText = params
      .flatMap((param) => [param?.label, ...asArray(param?.values)])
      .filter(Boolean)
      .join(" ");
    const propsText = Object.entries(propsMap)
      .map(([key, values]) => `${key} ${values.join(" ")}`)
      .join(" ");

    const currentControlPathIds = [...controlPathIds, id];
    const currentControlPathTitles = [...controlPathTitles, title];
    const breadcrumbs = [...groupPathTitles, ...currentControlPathTitles];

    const detail = {
      id,
      title,
      class: control?.class ?? null,
      topGroupId,
      parentGroupId,
      parentControlId,
      controlDepth,
      groupPathIds,
      groupPathTitles,
      controlPathIds: currentControlPathIds,
      controlPathTitles: currentControlPathTitles,
      pathIds: [...groupPathIds, ...currentControlPathIds],
      breadcrumbs,
      statementText,
      guidanceText,
      props: props.map((prop) => ({
        name: prop?.name ?? null,
        ns: prop?.ns ?? null,
        value: prop?.value ?? null
      })),
      propsMap,
      params: params.map(mapParam),
      parts: parts.map(mapPart),
      tags,
      modalverbs,
      targetObjects,
      secLevel: firstValue(propsMap.sec_level, null),
      effortLevel: firstValue(propsMap.effort_level, null),
      links: links.map((link) => ({
        rel: link?.rel ?? null,
        href: link?.href ?? null
      })),
      relationsOutgoing: [],
      relationsIncoming: []
    };

    for (const link of links) {
      const href = String(link?.href ?? "");
      const rel = String(link?.rel ?? "").trim() || "related";
      if (!href.startsWith("#")) {
        continue;
      }
      relationEdges.push({
        sourceControlId: id,
        targetControlId: href.slice(1),
        relType: rel
      });
    }

    const relationTypes = uniq(detail.links.map((link) => link.rel));

    docs.push({
      docId: id,
      entityType: "control",
      id,
      title,
      class: detail.class,
      topGroupId,
      parentGroupId,
      parentControlId,
      breadcrumbs,
      groupPathIds,
      groupPathTitles,
      statementText,
      guidanceText,
      paramsText,
      propsText,
      facets: {
        topGroupId,
        groupId: parentGroupId,
        secLevel: detail.secLevel,
        effortLevel: detail.effortLevel,
        class: detail.class,
        tags,
        modalverbs,
        targetObjects,
        relationTypes,
        hasRelations: relationTypes.length > 0
      }
    });

    ensureTopGroupBucket(topGroupId).controls[id] = detail;
    detailsById.set(id, detail);

    for (const childControl of asArray(control?.controls)) {
      processControl({
        control: childControl,
        parentGroupId,
        parentControlId: id,
        groupPathIds,
        groupPathTitles,
        controlPathIds: currentControlPathIds,
        controlPathTitles: currentControlPathTitles,
        topGroupId,
        controlDepth: controlDepth + 1
      });
    }
  }

  function processGroup(group, parentGroupId, pathIds, pathTitles, depth, topGroupId) {
    const node = pushGroupNode(group, parentGroupId, pathIds, pathTitles, depth, topGroupId);
    const treeNode = {
      id: node.id,
      title: node.title,
      topGroupId,
      children: []
    };

    for (const control of asArray(group?.controls)) {
      processControl({
        control,
        parentGroupId: node.id,
        parentControlId: null,
        groupPathIds: node.pathIds,
        groupPathTitles: node.pathTitles,
        controlPathIds: [],
        controlPathTitles: [],
        topGroupId,
        controlDepth: 1
      });
    }

    for (const subgroup of asArray(group?.groups)) {
      const subgroupNode = processGroup(
        subgroup,
        node.id,
        [...node.pathIds, String(subgroup?.id ?? "")],
        [...node.pathTitles, String(subgroup?.title ?? "").trim() || "Unbenannte Gruppe"],
        depth + 1,
        topGroupId
      );
      treeNode.children.push(subgroupNode);
    }

    return treeNode;
  }

  for (const topGroup of catalog.groups) {
    const topGroupId = String(topGroup?.id ?? "").trim();
    const topGroupTitle = String(topGroup?.title ?? "").trim() || "Unbenannte Gruppe";
    const treeNode = processGroup(topGroup, null, [topGroupId], [topGroupTitle], 1, topGroupId);
    groupTree.push(treeNode);
  }

  for (const edge of relationEdges) {
    const source = detailsById.get(edge.sourceControlId);
    const target = detailsById.get(edge.targetControlId);
    if (!source || !target) {
      continue;
    }

    source.relationsOutgoing.push(edge);
    target.relationsIncoming.push(edge);
  }

  const stats = {
    topGroupCount: groupTree.length,
    groupCount: groupNodes.length,
    controlCount: docs.length,
    relationCount: relationEdges.length,
    controlsWithRelations: docs.filter((doc) => doc.facets.hasRelations).length
  };

  return {
    meta: catalogMeta,
    groups: groupNodes,
    groupTree,
    docs,
    detailsByTopGroup,
    stats
  };
}
