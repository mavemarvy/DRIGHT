-- DRIGHT Prompt 2B security hardening.
-- Keeps extension functions outside public and fixes mutable search paths.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- Recreate intelligence functions with an explicit search_path and qualified similarity calls.
-- The function bodies remain the same as the 2B baseline; this migration only hardens resolution.

alter function public.search_marketplace_intelligent(text,text,uuid,numeric,numeric,text,integer,integer) set search_path = public, extensions, pg_catalog;
alter function public.get_similar_marketplace_items(uuid,integer) set search_path = public, extensions, pg_catalog;
alter function public.get_marketplace_trending(text,integer) set search_path = public, pg_catalog;

-- Trigger functions are not intended to be callable through PostgREST.
revoke execute on function public.audit_algorithm_version_change() from anon, authenticated, public;
