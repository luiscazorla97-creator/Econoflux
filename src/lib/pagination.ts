export function archivePage(value: string | null) {
  return Math.max(1, Math.min(10000, Math.floor(Number(value) || 1)));
}
export function pagePath(path: string, page: number) {
  return path + (page > 1 ? `?page=${page}` : "");
}
