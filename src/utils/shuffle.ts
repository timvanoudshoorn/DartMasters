export function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomInsert<T>(base: T[], item: T): T[] {
  const index = Math.floor(Math.random() * (base.length + 1));
  return [...base.slice(0, index), item, ...base.slice(index)];
}
