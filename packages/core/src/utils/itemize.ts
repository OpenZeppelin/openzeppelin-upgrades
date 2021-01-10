// itemize returns a markdown-like list of the items

// itemize['a\nb', 'c'] =
// - a
//   b
// - c

export function itemize(...items: string[]): string {
  return items.map(item => item.replace(/^/gm, (_, i) => (i === 0 ? '- ' : '  '))).join('\n');
}
