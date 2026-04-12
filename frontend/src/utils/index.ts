export function createPageUrl(pageName: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const [rawPath, rawQuery] = pageName.split('?', 2);
  const basePath = '/' + rawPath.toLowerCase().replace(/ /g, '-');

  // If params object is provided, build query string from it and ignore inline query in pageName
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  // No params object: preserve any inline query (including casing)
  return rawQuery ? `${basePath}?${rawQuery}` : basePath;
}