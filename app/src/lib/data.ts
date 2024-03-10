export async function getPaged<T extends any>(
  getResults: (iteration: {
    limit: number;
    offset: number;
  }) => Promise<{ expect?: number; results: T[] }>,
  options: { limit?: number } = {}
) {
  const { limit = 100 } = options;
  let all: T[] = [];
  let page = 0;
  let res: Awaited<ReturnType<typeof getResults>>;
  do {
    res = await getResults({ limit, offset: page * limit });
    all = [...all, ...res.results];
    page++;
  } while (
    res &&
    (!res.expect || res.expect > all.length) &&
    res.results.length
  );
  return all;
}
