"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RolesPage() {
  const supabase = createClient();
  const [roles,setRoles]=useState<any[]>([]); const [permissions,setPermissions]=useState<any[]>([]); const [selected,setSelected]=useState(""); const [grants,setGrants]=useState<Set<string>>(new Set()); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); if(!user){window.location.href="/login?next=/admin/roles";return;}
    const {data:allowed}=await supabase.rpc("admin_has_permission",{p_permission:"roles.manage",p_user_id:user.id}); if(!allowed){setError("You do not have permission to manage roles.");return;}
    const [{data:r},{data:p}]=await Promise.all([supabase.from("roles").select("id,name,slug,description,is_system_role,is_active").order("name"),supabase.from("permissions").select("id,name,slug,resource,action").order("slug")]);
    setRoles(r||[]);setPermissions(p||[]); if(!selected&&r?.length)setSelected(r[0].id);
  }
  async function loadGrants(roleId:string){const {data}=await supabase.from("role_permissions").select("permission_id").eq("role_id",roleId);setGrants(new Set((data||[]).map(x=>x.permission_id)));}
  useEffect(()=>{load();},[]); useEffect(()=>{if(selected)loadGrants(selected);},[selected]);
  async function toggle(permissionId:string){const next=new Set(grants); if(next.has(permissionId))next.delete(permissionId);else next.add(permissionId);setGrants(next);}
  async function save(){setSaving(true);setError(""); const role=roles.find(r=>r.id===selected); if(!role){return;} const {data:{user}}=await supabase.auth.getUser(); if(!user){return;}
    const {error:del}=await supabase.from("role_permissions").delete().eq("role_id",selected); if(del){setError(del.message);setSaving(false);return;}
    if(grants.size){const {error:ins}=await supabase.from("role_permissions").insert([...grants].map(permission_id=>({role_id:selected,permission_id,granted_by:user.id}))); if(ins)setError(ins.message);}
    await supabase.from("audit_logs").insert({actor_user_id:user.id,action:"role_permissions_updated",resource_type:"role",resource_id:role.slug,metadata:{permission_count:grants.size}}); setSaving(false);
  }
  if(error&&!roles.length)return <main className="mx-auto max-w-xl px-4 py-16 text-center"><ShieldCheck className="mx-auto" size={40}/><h1 className="mt-4 text-2xl font-semibold">Access restricted</h1><p className="mt-2 text-sm text-[var(--muted)]">{error}</p></main>;
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Governance · RBAC</p><h1 className="mt-1 text-3xl font-semibold">Roles & Permissions</h1><p className="mt-2 text-sm text-[var(--muted)]">Manage administrator role bundles using the existing DRIGHT authorization model.</p></div><div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]"><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Roles</p>{roles.map(r=><button key={r.id} onClick={()=>setSelected(r.id)} className={`w-full rounded-xl px-3 py-3 text-left ${selected===r.id?"bg-[var(--primary)] text-[var(--background)]":"hover:bg-[var(--background)]"}`}><p className="text-sm font-semibold">{r.name}</p><p className="mt-1 text-[11px] opacity-70">{r.slug}{r.is_system_role?" · system":""}</p></button>)}</section><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">{roles.find(r=>r.id===selected)?.name||"Select a role"}</h2><p className="text-xs text-[var(--muted)]">{roles.find(r=>r.id===selected)?.description}</p></div><button onClick={save} disabled={saving||!selected} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--background)]">{saving?<Loader2 className="animate-spin" size={16}/>:<Save size={16}/>}Save</button></div><div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{permissions.map(p=><label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3"><input type="checkbox" checked={grants.has(p.id)} onChange={()=>toggle(p.id)} className="mt-1"/><span><span className="block text-sm font-medium">{p.slug}</span><span className="mt-1 block text-xs text-[var(--muted)]">{p.name}</span></span></label>)}</div></section></div></main>;
}
