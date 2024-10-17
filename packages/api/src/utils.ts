export function formatMsDuration(duration: number): string {
  return `${(duration / 1000).toFixed(2)}s`;
}

export function formatMb(size: number): string {
  return `${(size / 1024 / 1024).toFixed(2)}MB`;
}
