-- Phase L reconciliation migration.
-- Production was already updated with the final SECURITY INVOKER analytics function during execution.
-- This migration is intentionally a no-op so replaying the recorded migration history cannot recurse.
do $$ begin
  null;
end $$;
