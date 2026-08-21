  useEffect(()=>{ load(); },[days]);

  const headline = useMemo(() => { if (!data) return []; const cards = [{k:"purchases",v:data.buyer?.purchases,i:ShoppingBag},{k:"spending",v:data.buyer?.spending,i:DollarSign},{k:"activity",v:data.buyer?.activity,i:BarChart3},{k:"recommendations",v:data.buyer?.recommendations,i:Sparkles}]; return cards; },[data]);

  function exportData() { if (!data || data.permissions?.admin !== true) return; const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download={`dright-analytics-${days}d.json`}; a.click(); URL.revokeObjectURL(url); }

  return <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <section className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8"><div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl"/><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Analytics command center</p><h1 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Understand what is actually happening.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Production metrics sourced from the current DRIGHT data architecture. Unsupported metrics are shown as unavailable instead of being invented.</p></div><div className="flex flex-wrap gap-2"><select value={days} onChange={e=>setDays(Number(e.target.value))} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold outline-none"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 365 days</option></select><button onClick={load} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2.5 text-sm font-semibold"><RefreshCw size={15}/> Refresh</button>{data?.permissions?.admin===true && <button onClick={exportData} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]"><Download size={15}/> Export</button>}</div></div></section>

    {error && <div className="mt-5 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
    {loading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-32 animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-muted)]"/>)}</div> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{headline.map(({k,v,i})=><Stat key={k} label={labels[k]} value={v} icon={i}/>)}</div>
      <div className="mt-7 grid gap-5">{data && <>
        <SectionCard title="Buyer analytics" eyebrow="Purchases & activity" icon={ShoppingBag} data={data.buyer}/>
      </>}</div>
    </>}
  </div>;
