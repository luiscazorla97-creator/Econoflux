export async function marketSnapshot(locals: any) {
  try {
    return await locals.runtime?.env?.DB?.prepare(
      "SELECT value,updated_at,last_error FROM market_cache WHERE id=1",
    ).first();
  } catch {
    return null;
  }
}
