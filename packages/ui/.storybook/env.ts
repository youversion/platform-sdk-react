export function firstAppKey(...candidates: (string | undefined)[]): string | undefined {
  return candidates.find((key) => key?.trim());
}
