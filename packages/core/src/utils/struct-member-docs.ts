import { StructDefinition } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';

import { SolcInput, SolcOutput } from '../solc-api';
import { SrcDecoder } from '../src-decoder';
import { UpgradesError } from '../error';
import debug from './debug';

/**
 * Resolves the NatSpec documentation of the members of a struct, keyed by member name. Members without documentation
 * are not included. Returns undefined if the documentation of the struct's members is not available.
 */
export type StructDocsResolver = (structDef: StructDefinition) => Map<string, string> | undefined;

/**
 * Thrown when the source text of a struct does not have the shape implied by its AST, so that the documentation of its
 * members cannot be located. This happens with syntax that the scanner does not know about.
 */
export class UnexpectedStructSourceError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(`${message} at byte ${position}`);
  }
}

/**
 * Builds a resolver for the member documentation of the structs in a compilation.
 *
 * Solidity does not include the NatSpec of struct members in its AST, so it is read from the source text in the
 * compiler input, between the source offsets of the members. The struct given to the resolver may come from the
 * namespaced compilation of the same sources, whose source text and AST ids differ from the original, so it is first
 * mapped to the original definition by source id and canonical name, which are the same in both compilations.
 *
 * @param solcInput The compiler input, or undefined if it is not available, in which case no documentation is resolved.
 * @param solcOutput The compiler output of the original compilation.
 * @param decodeSrc Source decoder for the original source code.
 * @returns The resolver, which throws an UpgradesError if the member documentation of a struct that contains rename or
 *   retype annotations cannot be read, and an Error if the struct is not part of the original compilation.
 */
export function makeStructDocsResolver(
  solcInput: SolcInput | undefined,
  solcOutput: SolcOutput,
  decodeSrc: SrcDecoder,
): StructDocsResolver {
  const sourcePaths = new Map<number, string>();
  const originalStructs = new Map<string, StructDefinition>();
  for (const [sourcePath, { ast, id }] of Object.entries(solcOutput.sources)) {
    sourcePaths.set(id, sourcePath);
    for (const structDef of findAll('StructDefinition', ast)) {
      originalStructs.set(getStructKey(structDef), structDef);
    }
  }

  const sources = new Map<number, Buffer | undefined>();
  const docs = new Map<string, Map<string, string> | undefined>();

  function getSource(sourceId: number): Buffer | undefined {
    if (!sources.has(sourceId)) {
      const sourcePath = sourcePaths.get(sourceId);
      const content = sourcePath === undefined ? undefined : solcInput?.sources[sourcePath]?.content;
      if (content === undefined) {
        debug(`Source content of ${sourcePath} is not available, annotations on its struct members are not read`);
      }
      sources.set(sourceId, content === undefined ? undefined : Buffer.from(content, 'utf8'));
    }
    return sources.get(sourceId);
  }

  function getDocs(structDef: StructDefinition): Map<string, string> | undefined {
    const source = getSource(getSourceId(structDef));
    if (source === undefined) {
      return undefined;
    }
    try {
      return getStructMemberDocumentation(structDef, source);
    } catch (e) {
      if (!(e instanceof UnexpectedStructSourceError)) {
        throw e;
      }
      const { start, end } = getPositions(structDef);
      if (/@custom:oz-(renamed|retyped)-from/.test(source.toString('utf8', start, end))) {
        throw new UpgradesError(
          `${decodeSrc(structDef)}: Could not read storage annotations on members of struct \`${structDef.canonicalName}\``,
          () =>
            'Please report this at https://zpl.in/upgrades/report and include the struct definition from your contract.',
        );
      }
      debug(
        `${decodeSrc(structDef)}: Could not read member documentation of struct ${structDef.canonicalName}: ${e.message}`,
      );
      return undefined;
    }
  }

  return structDef => {
    const key = getStructKey(structDef);
    const original = originalStructs.get(key);
    if (original === undefined) {
      throw new Error(`Broken invariant: struct ${structDef.canonicalName} not found in the original compilation`);
    }
    if (!docs.has(key)) {
      docs.set(key, getDocs(original));
    }
    return docs.get(key);
  };
}

function getStructKey(structDef: StructDefinition): string {
  return `${getSourceId(structDef)}:${structDef.canonicalName}`;
}

function getSourceId(node: Node): number {
  return Number(node.src.split(':')[2]);
}

function getPositions(node: Node) {
  const [start, length] = node.src.split(':').map(Number);
  return { start, end: start + length };
}

// Byte values of the ASCII characters that delimit whitespace and comments. Any other byte, including the bytes of
// multi-byte UTF-8 sequences, is only accepted inside a comment, where it is kept as it is.
const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const STAR = 0x2a; // *
const SLASH = 0x2f; // /

/**
 * Reads the NatSpec documentation of the members of a struct from the source text of its definition, located with the
 * source offsets in the AST, which are byte offsets into the UTF-8 encoded source. The result is keyed by member
 * name, and members without documentation are not included.
 *
 * A member is documented like a state variable preceded by the same comments would be: its documentation is the last
 * `/**` block or run of consecutive `///` lines between the end of the previous member and the start of its
 * declaration, with the comment markers removed as in `getDocumentationBefore`. Comments in the struct header, inside
 * a member's declaration, between a member's name and its `;`, or after the last member document nothing.
 *
 * @throws UnexpectedStructSourceError if the source text of the struct does not have the shape implied by its AST.
 */
export function getStructMemberDocumentation(structDef: StructDefinition, source: Buffer): Map<string, string> {
  const docs = new Map<string, string>();
  const { start, end } = getPositions(structDef);
  let pos = expectText(source, start, end, 'struct');
  pos = expectText(source, skipTrivia(source, pos, end), end, structDef.name);
  pos = expectText(source, skipTrivia(source, pos, end), end, '{');
  for (const member of structDef.members) {
    const memberPos = getPositions(member);
    if (memberPos.start < pos || memberPos.end > end) {
      throw new UnexpectedStructSourceError(`Member ${member.name} is outside the expected range`, memberPos.start);
    }
    const doc = getDocumentationBefore(source, pos, memberPos.start);
    if (doc !== undefined) {
      docs.set(member.name, doc);
    }
    // The source range of a member ends at its name and does not include the `;`
    pos = expectText(source, skipTrivia(source, memberPos.end, end), end, ';');
  }
  pos = expectText(source, skipTrivia(source, pos, end), end, '}');
  if (pos !== end) {
    throw new UnexpectedStructSourceError('Expected the end of the struct', pos);
  }
  return docs;
}

/**
 * Returns the documentation that solc attaches to a declaration starting at byte `end` of the source when the previous
 * token ends at byte `start`, or undefined if there is none. The bytes in between may only be whitespace and comments.
 *
 * @throws UnexpectedStructSourceError if there is anything else between `start` and `end`.
 */
export function getDocumentationBefore(source: Buffer, start: number, end: number): string | undefined {
  const { pos, doc } = scanTrivia(source, start, end);
  if (pos !== end) {
    throw new UnexpectedStructSourceError('Unexpected text', pos);
  }
  return doc;
}

function skipTrivia(source: Buffer, start: number, end: number): number {
  return scanTrivia(source, start, end).pos;
}

function expectText(source: Buffer, pos: number, end: number, text: string): number {
  const next = pos + text.length;
  if (next > end || !source.subarray(pos, next).equals(Buffer.from(text))) {
    throw new UnexpectedStructSourceError(`Expected \`${text}\``, pos);
  }
  return next;
}

/**
 * A comment that can be documentation, as its lines without the comment markers: a run of `///` lines, or a `/**`
 * block split at its line breaks.
 */
interface DocComment {
  block: boolean;
  lines: string[];
}

/**
 * Scans the whitespace and comments starting at byte `start` of the source, stopping at `end` or at the first byte that
 * is neither, and returns that position together with the text of the documentation found: the last `/**` block or
 * run of consecutive `///` lines, or undefined if there is none or its text is empty.
 *
 * Whitespace is space, tab, CR and LF. A line comment is documentation if it starts with exactly three slashes, and a
 * block comment if its `/**` is followed by neither `*` nor `/`. A run of `///` lines continues through the next `///`
 * line only when exactly one line break and otherwise only spaces and tabs separate them: a blank line or any other
 * comment, even on the same line, ends the run.
 *
 * @throws UnexpectedStructSourceError at a block comment that is not closed before `end`.
 */
function scanTrivia(source: Buffer, start: number, end: number): { pos: number; doc: string | undefined } {
  const byteAt = (i: number) => (i < end ? source[i] : undefined);
  let doc: DocComment | undefined;
  let runOpen = false;
  let lineBreaks = 0;
  let pos = start;
  while (pos < end) {
    const byte = source[pos];
    if (byte === SPACE || byte === TAB) {
      pos += 1;
    } else if (byte === LF || byte === CR) {
      lineBreaks += 1;
      pos += byte === CR && byteAt(pos + 1) === LF ? 2 : 1;
    } else if (byte === SLASH && byteAt(pos + 1) === SLASH) {
      let lineEnd = pos + 2;
      while (lineEnd < end && source[lineEnd] !== LF && source[lineEnd] !== CR) {
        lineEnd += 1;
      }
      if (byteAt(pos + 2) === SLASH && byteAt(pos + 3) !== SLASH) {
        const line = source.toString('utf8', pos + 3, lineEnd);
        if (doc !== undefined && runOpen && lineBreaks === 1) {
          doc.lines.push(line);
        } else {
          doc = { block: false, lines: [line] };
        }
        runOpen = true;
      } else {
        runOpen = false;
      }
      lineBreaks = 0;
      pos = lineEnd;
    } else if (byte === SLASH && byteAt(pos + 1) === STAR) {
      const close = source.indexOf('*/', pos + 2);
      if (close < 0 || close + 2 > end) {
        throw new UnexpectedStructSourceError('Unterminated block comment', pos);
      }
      if (byteAt(pos + 2) === STAR && byteAt(pos + 3) !== STAR && byteAt(pos + 3) !== SLASH) {
        doc = { block: true, lines: source.toString('utf8', pos + 3, close).split(/\r\n|\r|\n/) };
      }
      runOpen = false;
      lineBreaks = 0;
      pos = close + 2;
    } else {
      break;
    }
  }
  return { pos, doc: doc === undefined ? undefined : getDocText(doc) };
}

/**
 * Joins the lines of a documentation comment into the text that solc produces for the same comment on a state
 * variable. Leading spaces and tabs are dropped from the first line and from every line of a block, then a single `*`
 * at the start of a block line is dropped too, since it is a decoration. A block line that starts with `**` instead
 * (counting the star that closes the comment for the last line) is kept whole and appended to the previous line
 * without a line break. Lines that are left empty are dropped, and the rest are joined with `\n`.
 *
 * The text of a `///` run whose first line is blank starts with a line break in solc; here that line is dropped like
 * any other blank line, which makes no difference to the annotations parsed from the text.
 */
function getDocText({ block, lines }: DocComment): string | undefined {
  let text = '';
  for (const [i, line] of lines.entries()) {
    let content = i === 0 || block ? line.replace(/^[ \t]+/, '') : line;
    let glued = false;
    if (block && i > 0) {
      if (content.startsWith('**') || (i === lines.length - 1 && content === '*')) {
        glued = true;
      } else if (content.startsWith('*')) {
        content = content.slice(1);
      }
    }
    if (content.length > 0) {
      text += text.length > 0 && !glued ? `\n${content}` : content;
    }
  }
  return text.length > 0 ? text : undefined;
}
