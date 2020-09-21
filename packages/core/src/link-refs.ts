import { SolcBytecode } from './solc-api';

export interface LinkReference {
  src: string;
  name: string;
  length: number;
  start: number;
  placeHolder: string;
}

export function extractLinkReferences(bytecode: SolcBytecode): LinkReference[] {
  const linkRefs: LinkReference[] = [];
  const { linkReferences } = bytecode;
  for (const source of Object.keys(linkReferences)) {
    for (const name of Object.keys(linkReferences[source])) {
      const { length, start } = linkReferences[source][name][0];
      const placeHolder = bytecode.object.substr(start * 2, length * 2);
      linkRefs.push({
        src: source,
        name,
        length,
        start,
        placeHolder,
      });
    }
  }
  return linkRefs;
}

export function replaceLinkReferences(bytecode: string, linkReferences: LinkReference[]): string {
  let unlinkedBytecode: string = bytecode;
  for (const linkRef of linkReferences) {
    const { length, start, placeHolder } = linkRef;
    unlinkedBytecode =
      unlinkedBytecode.substr(0, 2 + start * 2) + placeHolder + unlinkedBytecode.substr(2 + (start + length) * 2);
  }
  return unlinkedBytecode;
}
