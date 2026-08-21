  const filtered = people.filter((person) => `${person.display_name || ""} ${person.username || ""} ${person.profession || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8">
      <Link href={`/profile/${targetId}`} className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Back to profile</Link>
      <header className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Social network</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{targetName}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Explore this profile&apos;s public follower relationships. Private relationships remain protected by DRIGHT access policies.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-1">
          <button onClick={() => setTab("followers")} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === "followers" ? "bg-[var(--surface)] shadow-sm" : "text-[var(--muted)]"}`}>Followers</button>
          <button onClick={() => setTab("following")} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === "following" ? "bg-[var(--surface)] shadow-sm" : "text-[var(--muted)]"}`}>Following</button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"><Search size={16} className="text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}…`} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
      </header>
