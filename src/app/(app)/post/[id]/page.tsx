"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PostPage(){
 const {id}=useParams<{id:string}>();const supabase=useMemo(()=>createClient(),[]);const [post,setPost]=useState<any>(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{const {data}=await supabase.from('posts').select('id,public_id,body,post_type,created_at,author_user_id,community_id').or(`id.eq.${id},public_id.eq.${id}`).eq('status','published').maybeSingle();setPost(data);setLoading(false);})();},[id,supabase]);
 if(loading)return <main className="mx-auto max-w-3xl px-4 py-8"><div className="h-64 animate-pulse rounded-3xl bg-[var(--surface)]"/></main>;
 if(!post)return <main className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-semibold">Post not found</h1><Link href="/social" className="mt-4 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-contrast)]">Back to feed</Link></main>;
 return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><Link href="/social" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Social feed</Link><article className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><p className="text-xs text-[var(--muted)]">{post.public_id} · {new Date(post.created_at).toLocaleString()}</p><p className="mt-5 whitespace-pre-wrap text-base leading-7">{post.body}</p><div className="mt-7 flex items-center gap-5 text-sm text-[var(--muted)]"><span className="inline-flex items-center gap-1"><Heart size={17}/> React</span><span className="inline-flex items-center gap-1"><MessageCircle size={17}/> Comments</span>{post.community_id&&<Link href={`/communities/${post.community_id}`} className="ml-auto hover:text-[var(--foreground)]">Open community</Link>}</div></article></main>;
}
