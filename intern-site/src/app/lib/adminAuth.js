// Shared gate for the /api/admin/* routes -- same Bearer-token pattern
// already used by /api/cron/burn-and-distribute (see that route's own
// comment), reused here rather than inventing a second auth scheme.
// ADMIN_SECRET is a secret this app mints for itself (like CRON_SECRET),
// not a third-party credential -- server-only, never NEXT_PUBLIC_.
export function isAdminRequest(request) {
  const authHeader = request.headers.get("authorization");
  return Boolean(process.env.ADMIN_SECRET) && authHeader === `Bearer ${process.env.ADMIN_SECRET}`;
}
