export interface ParsedTypeId {
  id: string;
  head: string;
  args?: ParsedTypeId[];
  tail?: string;
  rets?: ParsedTypeId[];
}

export function parseTypeId(id: string): ParsedTypeId {
  const matcher = new StatefulGlobalMatcher(id);

  function parseList(): ParsedTypeId[] {
    const args = [];

    let i = matcher.index;
    let delim;

    while ((delim = matcher.match(/[(),]/))) {
      if (delim[0] === '(') {
        let depth = 1;
        while (depth > 0) {
          const paren = matcher.match(/[()]/)?.[0];
          if (paren === '(') {
            depth += 1;
          } else if (paren === ')') {
            depth -= 1;
          } else {
            throw new Error(`Malformed type id ${id}`);
          }
        }
      } else {
        const subtype = id.slice(i, delim.index);
        if (subtype) {
          args.push(parseTypeId(subtype));
        }
        i = delim.index + 1;
        if (delim[0] === ')') {
          break;
        }
      }
    }

    return args;
  }

  const openArgs = matcher.match(/\(/);
  const head = id.slice(0, openArgs?.index);
  let args, tail, rets;

  if (openArgs) {
    args = parseList();

    const startTail = matcher.index;
    const openRet = matcher.match(/\(/);

    if (!openRet) {
      tail = id.slice(startTail) || undefined;
    } else {
      rets = parseList();
    }
  }

  return { id, head, args, tail, rets };
}

class StatefulGlobalMatcher {
  index = 0;

  constructor(private readonly text: string) {}

  match(re: RegExp | string): RegExpExecArray | null {
    const gre = new RegExp(re, 'g');
    gre.lastIndex = this.index;
    const match = gre.exec(this.text);
    if (match !== null) {
      this.index = gre.lastIndex;
    }
    return match;
  }
}
