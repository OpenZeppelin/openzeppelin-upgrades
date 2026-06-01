import test from 'ava';
import { Expression } from 'solidity-ast';

import { getErc7201BuiltinNamespaceId, resolveBaseSlot } from './erc7201-builtin';
import { calculateERC7201StorageLocation } from './erc7201';

// keccak256(abi.encode(uint256(keccak256("example.main")) - 1)) & ~bytes32(uint256(0xff))
const EXAMPLE_MAIN_LOCATION = '0x183a6125c38840424c4a85fa12bab2ab606c4b6d0e7cc73c0c06ba5300eab500';

function stringLiteral(value: string | null, hexValue?: string): Expression {
  return {
    nodeType: 'Literal',
    kind: 'string',
    value,
    hexValue: hexValue ?? (value === null ? '' : Buffer.from(value, 'utf8').toString('hex')),
  } as unknown as Expression;
}

function numberLiteral(value: string): Expression {
  return {
    nodeType: 'Literal',
    kind: 'number',
    value,
    hexValue: '',
  } as unknown as Expression;
}

function erc7201Call(
  args: Expression[],
  opts: { name?: string; referencedDeclaration?: number | null } = {},
): Expression {
  return {
    nodeType: 'FunctionCall',
    kind: 'functionCall',
    arguments: args,
    expression: {
      nodeType: 'Identifier',
      name: opts.name ?? 'erc7201',
      referencedDeclaration: opts.referencedDeclaration ?? -1,
    },
  } as unknown as Expression;
}

test('builtin call returns namespace id', t => {
  t.is(getErc7201BuiltinNamespaceId(erc7201Call([stringLiteral('example.main')])), 'example.main');
});

test('builtin call with absent referencedDeclaration', t => {
  const node = erc7201Call([stringLiteral('example.main')], { referencedDeclaration: null });
  t.is(getErc7201BuiltinNamespaceId(node), 'example.main');
});

test('user-defined function named erc7201 is rejected', t => {
  // A real declaration id (>= 0) indicates a user-defined function, not the builtin.
  const node = erc7201Call([stringLiteral('example.main')], { referencedDeclaration: 42 });
  t.is(getErc7201BuiltinNamespaceId(node), undefined);
});

test('different function name is rejected', t => {
  t.is(getErc7201BuiltinNamespaceId(erc7201Call([stringLiteral('example.main')], { name: 'keccak256' })), undefined);
});

test('non-string argument is rejected', t => {
  t.is(getErc7201BuiltinNamespaceId(erc7201Call([numberLiteral('1')])), undefined);
});

test('wrong argument count is rejected', t => {
  t.is(getErc7201BuiltinNamespaceId(erc7201Call([])), undefined);
  t.is(getErc7201BuiltinNamespaceId(erc7201Call([stringLiteral('a'), stringLiteral('b')])), undefined);
});

test('non-call expression is rejected', t => {
  t.is(getErc7201BuiltinNamespaceId(numberLiteral('1')), undefined);
  t.is(getErc7201BuiltinNamespaceId(stringLiteral('example.main')), undefined);
});

test('string literal only available as hex is decoded', t => {
  const node = erc7201Call([stringLiteral(null, Buffer.from('example.main', 'utf8').toString('hex'))]);
  t.is(getErc7201BuiltinNamespaceId(node), 'example.main');
});

test('prefixed id is returned verbatim (no implicit prefix stripping)', t => {
  // The builtin takes the bare id; passing an `erc7201:`-prefixed string is the caller's choice and is
  // returned as-is so it hashes to a different location than the unprefixed form.
  t.is(getErc7201BuiltinNamespaceId(erc7201Call([stringLiteral('erc7201:example.main')])), 'erc7201:example.main');
});

test('resolveBaseSlot resolves builtin to its storage location', t => {
  t.is(resolveBaseSlot(erc7201Call([stringLiteral('example.main')])), EXAMPLE_MAIN_LOCATION);
  t.is(resolveBaseSlot(erc7201Call([stringLiteral('example.main')])), calculateERC7201StorageLocation('example.main'));
});

test('resolveBaseSlot normalizes numeric literals', t => {
  t.is(resolveBaseSlot(numberLiteral('0x1')), '0x0000000000000000000000000000000000000000000000000000000000000001');
  t.is(resolveBaseSlot(numberLiteral('1')), '0x0000000000000000000000000000000000000000000000000000000000000001');
});

test('resolveBaseSlot returns undefined for unsupported expressions', t => {
  t.is(resolveBaseSlot(erc7201Call([numberLiteral('1')])), undefined);
});
