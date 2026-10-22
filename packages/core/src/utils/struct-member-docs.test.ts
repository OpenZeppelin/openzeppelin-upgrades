import test, { ExecutionContext } from 'ava';
import { artifacts, run } from 'hardhat';
import {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  TASK_COMPILE_SOLIDITY_RUN_SOLC,
  TASK_COMPILE_SOLIDITY_RUN_SOLCJS,
} from 'hardhat/builtin-tasks/task-names';
import { SolcBuild } from 'hardhat/types/builtin-tasks';
import { promises as fs } from 'fs';
import { ContractDefinition, StructDefinition, VariableDeclaration } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import * as versions from 'compare-versions';

import { SolcInput, SolcOutput } from '../solc-api';
import { solcInputOutputDecoder } from '../src-decoder';
import { getRetypedRenamedFromDoc } from '../storage/extract';
import {
  getDocumentationBefore,
  getStructMemberDocumentation,
  makeStructDocsResolver,
  UnexpectedStructSourceError,
} from './struct-member-docs';

const twinsSource = 'contracts/test/StructMemberDocs.sol';

function getPositions(node: { src: string }) {
  const [start, length] = node.src.split(':').map(Number);
  return { start, end: start + length };
}

async function getBuildInfo(source: string, contract: string) {
  const buildInfo = await artifacts.getBuildInfo(`${source}:${contract}`);
  if (buildInfo === undefined) {
    throw new Error('Build info not found');
  }
  return buildInfo;
}

function getSource(input: SolcInput, source: string): Buffer {
  const content = input.sources[source].content;
  if (content === undefined) {
    throw new Error(`Content for ${source} not available`);
  }
  return Buffer.from(content, 'utf8');
}

function getContract(output: SolcOutput, source: string, name: string): ContractDefinition {
  const contractDef = [...findAll('ContractDefinition', output.sources[source].ast)].find(c => c.name === name);
  if (contractDef === undefined) {
    throw new Error(`Contract ${name} not found`);
  }
  return contractDef;
}

function getStruct(contractDef: ContractDefinition, name: string): StructDefinition {
  const structDef = [...findAll('StructDefinition', contractDef)].find(s => s.name === name);
  if (structDef === undefined) {
    throw new Error(`Struct ${name} not found`);
  }
  return structDef;
}

/**
 * Asserts that each member of the struct in the twin fixture has documentation exactly when the state variable with
 * the same name has, with the same annotations, and returns the member documentation.
 */
function assertTwins(t: ExecutionContext, input: SolcInput, output: SolcOutput): Map<string, string> {
  const contractDef = getContract(output, twinsSource, 'StructMemberDocs');
  const stateVars: VariableDeclaration[] = [];
  for (const node of contractDef.nodes) {
    if (node.nodeType === 'VariableDeclaration') {
      stateVars.push(node);
    }
  }
  const structDef = getStruct(contractDef, 'S');
  const names = structDef.members.map(m => m.name);
  t.deepEqual(
    stateVars.map(v => v.name),
    names,
  );

  const expected = new Map<string, string>();
  for (const stateVar of stateVars) {
    if (stateVar.documentation) {
      expected.set(stateVar.name, stateVar.documentation.text);
    }
  }
  t.true(expected.size >= 25);

  const docs = getStructMemberDocumentation(structDef, getSource(input, twinsSource));
  t.deepEqual([...docs.keys()], [...expected.keys()]);
  for (const name of names) {
    t.deepEqual(
      getRetypedRenamedFromDoc(docs.get(name) ?? ''),
      getRetypedRenamedFromDoc(expected.get(name) ?? ''),
      name,
    );
  }
  return docs;
}

/**
 * Compiles the twin fixture again with the given line endings.
 */
async function compileTwins(lineEnding: string) {
  const { input, solcVersion } = await getBuildInfo(twinsSource, 'StructMemberDocs');
  const content = getSource(input, twinsSource)
    .toString('utf8')
    .replace(/\r\n|\r|\n/g, lineEnding);
  const newInput = { ...input, sources: { [twinsSource]: { content } } };
  return { input: newInput, output: await hardhatCompile(newInput, solcVersion) };
}

async function hardhatCompile(input: SolcInput, solcVersion: string): Promise<SolcOutput> {
  const solcBuild: SolcBuild = await run(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, {
    quiet: true,
    solcVersion,
  });

  const output: SolcOutput = solcBuild.isSolcJs
    ? await run(TASK_COMPILE_SOLIDITY_RUN_SOLCJS, { input, solcJsPath: solcBuild.compilerPath })
    : await run(TASK_COMPILE_SOLIDITY_RUN_SOLC, { input, solcPath: solcBuild.compilerPath });

  const errors = output.errors?.filter(e => e.severity === 'error');
  if (errors !== undefined && errors.length > 0) {
    throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  }
  return output;
}

test('member documentation has the same annotations as state variable documentation', async t => {
  const { input, output } = await getBuildInfo(twinsSource, 'StructMemberDocs');
  // The fixture has a line of only whitespace between two doc lines, and a doc block line of a star and a space
  const content = getSource(input, twinsSource).toString('utf8');
  t.regex(content, /\n[ \t]+\r?\n/);
  t.regex(content, /\n[ \t]+\* \r?\n/);
  const docs = assertTwins(t, input, output);
  t.snapshot(Object.fromEntries(docs));
});

test('member documentation with CRLF line endings', async t => {
  const { input, output } = await compileTwins('\r\n');
  assertTwins(t, input, output);
});

test('member documentation with CR line endings', async t => {
  const { input, output } = await compileTwins('\r');
  assertTwins(t, input, output);
});

test('member documentation', async t => {
  const source = 'contracts/test/StructMemberRenamedRetyped.sol';
  const { input, output } = await getBuildInfo(source, 'StructMemberRenamedRetypedV2');
  const contractDef = getContract(output, source, 'StructMemberRenamedRetypedV2');
  const content = getSource(input, source);
  t.deepEqual(
    getStructMemberDocumentation(getStruct(contractDef, 'S'), content),
    new Map([
      ['x', '@custom:oz-retyped-from bytes32'],
      ['z', ' @dev documented in a block\n @custom:oz-renamed-from y'],
      ['f', '@custom:oz-retyped-from uint8'],
      ['d', '@custom:oz-renamed-from oldD'],
    ]),
  );
  t.deepEqual(
    getStructMemberDocumentation(getStruct(contractDef, 'Inner'), content),
    new Map([
      ['g', '@custom:oz-renamed-from a\n@custom:oz-retyped-from uint8 '],
      ['bb', '@custom:oz-renamed-from b\n @dev documented on a second line'],
    ]),
  );
  t.deepEqual(getStructMemberDocumentation(getStruct(contractDef, 'Outer'), content), new Map());
});

test('struct shapes', async t => {
  const { input, output } = await getBuildInfo(twinsSource, 'StructMemberDocs');
  const contractDef = getContract(output, twinsSource, 'StructMemberDocs');
  const source = getSource(input, twinsSource);
  const docs = (name: string) => Object.fromEntries(getStructMemberDocumentation(getStruct(contractDef, name), source));
  t.deepEqual(docs('HeaderComments'), {});
  t.deepEqual(docs('BraceOnNextLine'), { first: '@custom:oz-renamed-from a' });
  t.deepEqual(docs('OneLine'), {});
  t.deepEqual(docs('DanglingDoc'), {});
});

/**
 * Yields the build info of every compilation of the fixtures.
 */
async function* getBuildInfos(): AsyncGenerator<{ solcVersion: string; input: SolcInput; output: SolcOutput }> {
  for (const buildInfoPath of await artifacts.getBuildInfoPaths()) {
    yield JSON.parse(await fs.readFile(buildInfoPath, 'utf8'));
  }
}

test('parity with solc documentation of state variables', async t => {
  // The annotations read from the source must be those that solc reads from the same comments, for every solc version
  // used by the fixtures. State variables are compared since solc includes their documentation in the AST. The texts
  // are compared as well, except for whitespace at their ends, which is where the text read from the source can differ.
  let compared = 0;
  for await (const buildInfo of getBuildInfos()) {
    // Solidity 0.5 does not include documentation in the AST
    const hasDocumentation = versions.compare(buildInfo.solcVersion, '0.6.0', '>=');
    for (const [sourcePath, { ast }] of Object.entries(buildInfo.output.sources)) {
      const source = getSource(buildInfo.input, sourcePath);
      for (const contractDef of findAll('ContractDefinition', ast)) {
        // The first declaration is preceded by the opening brace of the contract
        let prevEnd = source.indexOf('{', getPositions(contractDef).start) + 1;
        for (const node of contractDef.nodes) {
          const { start, end } = getPositions(node);
          if (node.nodeType === 'VariableDeclaration') {
            const description = `${buildInfo.solcVersion} ${sourcePath}:${contractDef.name}.${node.name}`;
            let actual;
            try {
              actual = getDocumentationBefore(source, prevEnd, start);
            } catch (e) {
              t.fail(`${description}: ${e}`);
            }
            if (hasDocumentation) {
              const expected = node.documentation?.text;
              t.is(actual?.trim(), expected?.trim(), description);
              t.deepEqual(
                getRetypedRenamedFromDoc(actual ?? ''),
                getRetypedRenamedFromDoc(expected ?? ''),
                description,
              );
              if (expected !== undefined) {
                compared += 1;
              }
            }
          }
          prevEnd = skipSemicolon(source, end);
        }
      }
    }
  }
  t.true(compared >= 50, `Compared ${compared} documented state variables`);
});

/**
 * The source range of some declarations, such as state variables, does not include the `;` that ends them, nor the
 * whitespace and comments before it.
 */
function skipSemicolon(source: Buffer, pos: number): number {
  const match = /^(?:[ \t\r\n]|\/\/[^\r\n]*|\/\*[^]*?\*\/)*;/.exec(source.toString('latin1', pos));
  return match === null ? pos : pos + match[0].length;
}

test('struct definitions of every fixture', async t => {
  // The source of every struct must have the shape that the scanner expects, whichever solc version compiled it, and
  // a struct without doc comments has no member documentation
  let checked = 0;
  for await (const buildInfo of getBuildInfos()) {
    for (const [sourcePath, { ast }] of Object.entries(buildInfo.output.sources)) {
      const source = getSource(buildInfo.input, sourcePath);
      for (const structDef of findAll('StructDefinition', ast)) {
        const description = `${buildInfo.solcVersion} ${sourcePath}:${structDef.canonicalName}`;
        let docs;
        try {
          docs = getStructMemberDocumentation(structDef, source);
        } catch (e) {
          t.fail(`${description}: ${e}`);
          continue;
        }
        const { start, end } = getPositions(structDef);
        const text = source.toString('utf8', start, end);
        if (!text.includes('///') && !text.includes('/**')) {
          t.is(docs.size, 0, description);
        }
        checked += 1;
      }
    }
  }
  t.true(checked >= 100, `Checked ${checked} structs`);
});

test('struct not in the original compilation', async t => {
  const source = 'contracts/test/StructMemberRenamedRetyped.sol';
  const buildInfo = await getBuildInfo(source, 'StructMemberRenamedRetypedV2');
  const decodeSrc = solcInputOutputDecoder(buildInfo.input, buildInfo.output);
  const resolver = makeStructDocsResolver(buildInfo.input, buildInfo.output, decodeSrc);
  const [structDef] = findAll('StructDefinition', buildInfo.output.sources[source].ast);
  t.true(resolver(structDef) instanceof Map);
  t.throws(() => resolver({ ...structDef, canonicalName: 'Unknown.S' }), { message: /Broken invariant/ });
});

test('unexpected text', t => {
  const source = Buffer.from('/* a */ /// b\n uint8 x /// c\n', 'utf8');
  t.is(getDocumentationBefore(source, 0, source.indexOf('uint8')), 'b');

  const error = t.throws(() => getDocumentationBefore(source, 0, source.length), {
    instanceOf: UnexpectedStructSourceError,
  });
  t.is(error?.position, source.indexOf('uint8'));

  // Only spaces, tabs and line breaks are whitespace
  for (const char of ['\u00a0', '\f']) {
    const text = Buffer.from(`/// a\n${char}uint8 x`, 'utf8');
    const error = t.throws(() => getDocumentationBefore(text, 0, text.indexOf('uint8')), {
      instanceOf: UnexpectedStructSourceError,
    });
    t.is(error?.position, text.indexOf(char));
  }

  t.throws(() => getDocumentationBefore(Buffer.from('/** a\n'), 0, 6), { instanceOf: UnexpectedStructSourceError });
  t.throws(() => getDocumentationBefore(Buffer.from('/* a\n'), 0, 5), { instanceOf: UnexpectedStructSourceError });
});

/**
 * Builds the AST of a struct from its source text, in which each member declaration is enclosed in brackets that are
 * not part of the source. The source range of the struct is the whole text.
 */
function makeStruct(name: string, text: string): { structDef: StructDefinition; source: Buffer } {
  const members = [];
  let source = '';
  for (const [i, part] of text.split(/[[\]]/).entries()) {
    // The parts at odd indexes are the member declarations
    if (i % 2 === 1) {
      const src = `${Buffer.byteLength(source)}:${Buffer.byteLength(part)}:0`;
      members.push({ nodeType: 'VariableDeclaration', name: part.split(/\s+/).pop(), src });
    }
    source += part;
  }
  const structDef = { nodeType: 'StructDefinition', name, src: `0:${Buffer.byteLength(source)}:0`, members };
  return { structDef: structDef as unknown as StructDefinition, source: Buffer.from(source, 'utf8') };
}

function assertUnexpectedStruct(t: ExecutionContext, name: string, text: string, position: (source: Buffer) => number) {
  const { structDef, source } = makeStruct(name, text);
  const error = t.throws(() => getStructMemberDocumentation(structDef, source), {
    instanceOf: UnexpectedStructSourceError,
  });
  t.is(error?.position, position(source), text);
}

test('unexpected struct source', t => {
  const { structDef, source } = makeStruct('S', 'struct S {\n /// a\n [uint256 x];\n [uint256 y] /// b\n ; /// c\n}');
  t.deepEqual(getStructMemberDocumentation(structDef, source), new Map([['x', 'a']]));

  assertUnexpectedStruct(t, 'S', 'contract S { [uint256 x]; }', () => 0);
  assertUnexpectedStruct(t, 'T', 'struct S { [uint256 x]; }', s => s.indexOf('S'));
  assertUnexpectedStruct(t, 'S', 'struct S [uint256 x]; }', s => s.indexOf('uint256'));
  assertUnexpectedStruct(t, 'S', 'struct S { [uint256 x] [uint256 y]; }', s => s.indexOf('uint256 y'));
  assertUnexpectedStruct(t, 'S', 'struct S { [uint256 x]; } ', s => s.indexOf('}') + 1);
  assertUnexpectedStruct(t, 'S', 'struct S { [uint256 x]; \u00a0}', s => s.indexOf('\u00a0'));
  assertUnexpectedStruct(t, 'S', 'struct S { /** a\n [uint256 x]; }', s => s.indexOf('/**'));

  // A member that starts before the end of the previous member
  structDef.members.reverse();
  const error = t.throws(() => getStructMemberDocumentation(structDef, source), {
    instanceOf: UnexpectedStructSourceError,
  });
  t.is(error?.position, source.indexOf('uint256 x'));
});
