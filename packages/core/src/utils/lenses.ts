/* eslint-disable @typescript-eslint/no-explicit-any */

export type Lens<T, V> = (obj: T) => BoundLens<T, V>;

export interface BoundLens<T, V> {
  get(): V;
  set(value: V): void;
  delete(): void;
}

type Key = string;

type Path<T, P extends Key[]> = P extends [infer P0]
  ? Get<T, P0>
  : P extends [infer P0, infer P1]
  ? Get<Get<T, P0>, P1>
  : undefined;

type Get<T, K> = T extends { [k in Key & K]: infer U }
  ? U
  : T extends { [k in Key & K]?: infer U }
  ? U | undefined
  : undefined;

type PathLens<P0 extends Key, P extends Key[]> = <T>(obj: T) => BoundLens<T, Path<T, Cons<P0, P>>>;

// Cons<'a', ['b', 'c']> = ['a', 'b', 'c']
type Cons<H, T extends any[]> = ((head: H, ...tail: T) => void) extends (...args: infer A) => void ? A : never;

export function pathLens<P0 extends Key, P extends Key[]>(
  path0: P0,
  ...path: P
): <T>(obj: T) => BoundLens<T, Path<T, Cons<P0, P>>> {
  return function <T>(obj: T) {
    return {
      get: () => getAtPath(obj, path0, ...path),
      set: value => {
        const { target, key } = getTarget(obj, path0, ...path);
        target[key] = value;
      },
      delete: () => {
        const { target, key } = getTarget(obj, path0, ...path);
        delete target[key];
      },
    };
  };
}

function getAtPath(res: any, ...path: any[]) {
  for (const key of path) {
    if (key in res) {
      res = res[key];
    } else {
      return undefined;
    }
  }
  return res;
}

function getTarget(res: any, path0: any, ...path: any[]): { target: any; key: any };
function getTarget(res: any, ...path: any[]) {
  const key = path.pop();
  const target = getAtPath(res, ...path);
  if (target === undefined) {
    throw new Error('Could not retrieve nested value');
  }
  return { target, key };
}
