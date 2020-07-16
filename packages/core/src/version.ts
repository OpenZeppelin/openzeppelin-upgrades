import crypto from 'crypto';
import cbor from 'cbor';

export function getVersionId(bytecode: string): string {
  return hashBytecode(bytecode);
}

export function hashBytecode(bytecode: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(bytecode.replace(/^0x/, ''));
  return hash.digest().toString('base64');
}

export function hashBytecodeWithoutMetadata(bytecode: string): string {
  return hashBytecode(trimBytecodeMetadata(bytecode));
}

function trimBytecodeMetadata(bytecode: string): string {
  // Bail on empty bytecode
  if (bytecode.length <= 4) {
    return bytecode;
  }

  // Gather length of CBOR metadata from the end of the file
  const rawLength = bytecode.slice(bytecode.length - 4);
  const metadataLength = parseInt(rawLength, 16) * 2;

  // Bail on unreasonable values for length
  if (metadataLength > bytecode.length - 4) {
    return bytecode;
  }

  // Gather what we assume is the CBOR encoded metadata, and try to parse it
  const metadataStart = bytecode.length - metadataLength - 4;
  const metadata = bytecode.slice(metadataStart, bytecode.length - 4);

  // Parse it to see if it is indeed valid metadata
  try {
    cbor.decode(Buffer.from(metadata, 'hex'));
  } catch (err) {
    // to do: log lack metadata to the user
    return bytecode;
  }

  // Return bytecode without it
  return bytecode.slice(0, metadataStart);
}
