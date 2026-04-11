-- Defense in depth: service_role bypasses RLS; anon/authenticated need explicit policies (none on these tables).
ALTER TABLE raw_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
