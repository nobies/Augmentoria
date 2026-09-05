-- Applied online as migration 20260905150723.
-- Defense in depth: the private schema already denies direct API table access.
-- Keep all access through the constrained share RPCs owned by postgres.
alter table private.review_share_links enable row level security;
alter table private.review_share_creation_attempts enable row level security;
revoke all on private.review_share_links from anon, authenticated;
revoke all on private.review_share_creation_attempts from anon, authenticated;
