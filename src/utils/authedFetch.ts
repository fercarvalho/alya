/**
 * Wrapper de `fetch` que injeta `Authorization: Bearer <token>` automaticamente
 * + `Content-Type: application/json` (a menos que o caller já tenha definido).
 *
 * O alya não tem interceptor global de fetch — cada chamada precisa
 * adicionar o header manualmente. Este helper centraliza isso para
 * componentes novos.
 *
 * Uso:
 *   const r = await authedFetch(token, '/api/transaction-rules');
 *   const r = await authedFetch(token, '/api/transaction-rules', {
 *     method: 'POST',
 *     body: JSON.stringify({ name: 'X' }),
 *   });
 */
export function authedFetch(
  token: string | null,
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers });
}
