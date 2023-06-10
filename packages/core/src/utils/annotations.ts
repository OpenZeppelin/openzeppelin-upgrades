import { execall } from './execall';

/**
 * Get args from the doc string matching the given tag.
 *
 * @param doc - The doc string to parse
 * @param tag - The tag to match
 * @param supportedArgs - The list of supported args, or undefined if all args are supported
 */
export function getAnnotationArgs(doc: string, tag: string, supportedArgs?: readonly string[]) {
  const result: string[] = [];
  for (const { groups } of execall(
    /^\s*(?:@(?<title>\w+)(?::(?<tag>[a-z][a-z-]*))? )?(?<args>(?:(?!^\s*@\w+)[^])*)/m,
    doc,
  )) {
    if (groups && groups.title === 'custom' && groups.tag === tag) {
      const trimmedArgs = groups.args.trim();
      if (trimmedArgs.length > 0) {
        result.push(...trimmedArgs.split(/\s+/));
      }
    }
  }

  if (supportedArgs !== undefined) {
    result.forEach(arg => {
      if (!supportedArgs.includes(arg)) {
        throw new Error(`NatSpec: ${tag} argument not recognized: ${arg}`);
      }
    });
  }

  return result;
}
