import { parseTypeId, ParsedTypeId } from '../utils/parse-type-id';

// The interfaces below are generic in the way types are represented (through the parameter `Type`). When stored on
// disk, the type is represented by a string: the type id. When loaded onto memory to run the storage layout comparisons
// found in this module, the type id is replaced by its parsed structure together with the corresponding TypeItem, e.g.
// the struct members if it is a struct type.

export interface StorageLayout {
  layoutVersion?: string;
  storage: StorageItem[];
  types: Record<string, TypeItem>;
}

export interface StorageItem<Type = string> {
  contract: string;
  label: string;
  type: Type;
  src: string;
}

export interface TypeItem<Type = string> {
  label: string;
  members?: TypeItemMembers<Type>;
}

export type TypeItemMembers<Type = string> = StructMember<Type>[] | EnumMember[];

export interface StructMember<Type = string> {
  label: string;
  type: Type;
}

export type EnumMember = string;

export interface ParsedTypeDetailed extends ParsedTypeId {
  item: TypeItem<ParsedTypeDetailed>;
  args?: ParsedTypeDetailed[];
  rets?: ParsedTypeDetailed[];
}

type Replace<T, K extends string, V> = Omit<T, K> & Record<K, V>;

export function getDetailedLayout(layout: StorageLayout): StorageItem<ParsedTypeDetailed>[] {
  const cache: Record<string, ParsedTypeDetailed> = {};

  return layout.storage.map(parseWithDetails);

  function parseWithDetails<I extends { type: string }>(item: I): Replace<I, 'type', ParsedTypeDetailed> {
    const parsed = parseTypeId(item.type);
    const withDetails = addDetailsToParsedType(parsed);
    return { ...item, type: withDetails };
  }

  function addDetailsToParsedType(parsed: ParsedTypeId): ParsedTypeDetailed {
    if (parsed.id in cache) {
      return cache[parsed.id];
    }

    const item = layout.types[parsed.id];
    const detailed: ParsedTypeDetailed = {
      ...parsed,
      args: undefined,
      rets: undefined,
      item: {
        ...item,
        members: undefined,
      },
    };

    // store in cache before recursion below
    cache[parsed.id] = detailed;

    detailed.args = parsed.args?.map(addDetailsToParsedType);
    detailed.rets = parsed.args?.map(addDetailsToParsedType);
    detailed.item.members =
      item?.members && (isStructMembers(item?.members) ? item.members.map(parseWithDetails) : item?.members);

    return detailed;
  }
}

export function isEnumMembers<T>(members: TypeItemMembers<T>): members is EnumMember[] {
  return members.length === 0 || typeof members[0] === 'string';
}

export function isStructMembers<T>(members: TypeItemMembers<T>): members is StructMember<T>[] {
  return members.length === 0 || typeof members[0] === 'object';
}
