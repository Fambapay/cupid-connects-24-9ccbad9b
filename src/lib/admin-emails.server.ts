// Server-only helper: resolve auth.users emails for a set of user ids in a
// single paginated scan, avoiding N+1 calls to auth.admin.getUserById.
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getEmailsForUserIds(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (!ids.length) return result
  const wanted = new Set(ids)
  const perPage = 1000
  const maxPages = 50 // ~50k users hard ceiling
  for (let page = 1; page <= maxPages && wanted.size > 0; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) break
    const users = data?.users ?? []
    for (const u of users) {
      if (u.email && wanted.has(u.id)) {
        result.set(u.id, u.email)
        wanted.delete(u.id)
      }
    }
    if (users.length < perPage) break
  }
  return result
}
