-- Development fixtures only. This file must never invent production product
-- records. Local `supabase db reset` may apply it; production applies
-- migrations only.
do $$
begin
  if coalesce(current_setting('app.environment', true), 'development') = 'production' then
    raise exception 'seed.sql is not allowed in production';
  end if;
end
$$;
