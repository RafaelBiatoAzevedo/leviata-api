export async function listPage<T>(
  query: { page?: number; limit?: number },
  itemsPromise: Promise<T[]>,
  totalPromise: Promise<number>,
) {
  const [items, total] = await Promise.all([itemsPromise, totalPromise]);
  return { items, total, page: query.page ?? 1, limit: query.limit ?? 10 };
}
