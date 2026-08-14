export async function completeBulkClose(
  ids: number[],
  status: string,
  search: string,
  close: (ids: number[]) => Promise<unknown>,
  clearSelection: () => void,
  refresh: (status: string, search: string) => Promise<void>
) {
  await close(ids);
  clearSelection();
  await refresh(status, search);
}
