import { SolcOutput, SolcInput } from './solc-api';

export type SrcDecoder = (node: { src: string }) => string;
type PathDecoder = (path: string) => string;

interface Source {
  name: string;
  content: string;
}

function identityPath(path: string): string {
  return path;
}

export function solcInputOutputDecoder(
  solcInput: SolcInput,
  solcOutput: SolcOutput,
  decodePath: PathDecoder = identityPath,
): SrcDecoder {
  const sources: Record<number, Source> = {};

  function getSource(sourceId: number): Source {
    if (sourceId in sources) {
      return sources[sourceId];
    } else {
      const path = Object.entries(solcOutput.sources).find(([, { id }]) => sourceId === id)?.[0];
      if (path === undefined) {
        throw new Error(`Source file not available`);
      }
      const content = solcInput.sources[path].content;
      if (content === undefined) {
        throw new Error(`Content for ${path} not available`);
      }
      const name = decodePath(path);
      return (sources[sourceId] = { name, content });
    }
  }

  return ({ src }) => {
    const [begin, , sourceId] = src.split(':').map(Number);
    const { name, content } = getSource(sourceId);
    const line = content.substr(0, begin).split('\n').length;
    return name + ':' + line;
  };
}
