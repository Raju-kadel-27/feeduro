export function buildToggleUrl(
  base: string,
  sp: URLSearchParams,
  key: string,
  value: string,
  isDashboard: boolean,
): string {
  const params = isDashboard ? new URLSearchParams(sp.toString()) : new URLSearchParams();
  const current = params.getAll(key);
  params.delete(key);
  if (current.includes(value)) {
    for (const v of current.filter((v) => v !== value)) params.append(key, v);
  } else {
    for (const v of current) params.append(key, v);
    params.append(key, value);
  }
  const qs = params.toString();
  return `${base}/dashboard${qs ? `?${qs}` : ""}`;
}
