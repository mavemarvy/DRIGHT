"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type RangeKey = "7d" | "30d" | "90d";
type RoleKey = "buyer" | "vendor" | "affiliate" | "referrals" | "jobs" | "admin";
type Point = { label: string; value: number };
type Metric = {
  label: string;
  value: number;
  previous: number;
  format?: "number" | "money" | "percent";
  currency?: string;
};
type Row = Record<string, string | number>;
type RoleState = Record<RoleKey, boolean>;
type Range = { key: RangeKey; label: string; days: number };

const rolesOrder: RoleKey[] = ["buyer", "vendor", "affiliate", "referrals", "jobs", "admin"];
const ranges: Range[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
];

const roleLabels: Record<RoleKey, string> = {
  buyer: "Buyer",
  vendor: "Seller",
  affiliate: "Affiliate",
  referrals: "Referrals",
  jobs: "Jobs",
  admin: "Admin",
};

function rangeBounds(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const previousEnd = new Date(start);
  previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);
  previousStart.setHours(0, 0, 0, 0);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
    previousFrom: previousStart.toISOString(),
    previousTo: previousEnd.toISOString(),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatMoney(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatMetric(metric: Metric) {
  if (metric.format === "money") return formatMoney(metric.value, metric.currency);
  if (metric.format === "percent") return `${metric.value.toFixed(1)}%`;
  return formatNumber(metric.value);
}

function changePercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function TrendChange({ current, previous }: { current: number; previous: number }) {
  const change = changePercent(current, previous);
  if (change === null) {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)]">
        <span>No prior data</span>
      </span>
    );
  }

  const positive = change >= 0;
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
        positive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {Math.abs(change).toFixed(1)}% vs previous period
    </span>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-[var(--muted)]">{metric.label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{formatMetric(metric)}</p>
      <TrendChange current={metric.value} previous={metric.previous} />
    </div>
  );
}

function Sparkline({ points }: { points: Point[] }) {
  if (!points.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--muted)]">
        No trend events available for this period.
      </div>
    );
  }

  const width = 640;
  const height = 180;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const y = (value: number) => height - (value / max) * (height - 20) - 10;
  const coords = points.map((point, index) => `${index * step},${y(point.value)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full text-[var(--primary)]"
      role="img"
      aria-label="Analytics trend chart"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
      {points.map((point, index) => (
        <circle
          key={`${point.label}-${index}`}
          cx={index * step}
          cy={y(point.value)}
          r="4"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function DataTable({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return <p className="p-6 text-sm text-[var(--muted)]">No data for this period.</p>;
  }

  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
            {columns.map((column) => (
              <th key={column} className="px-5 py-3 font-medium">
                {column.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[var(--border)] last:border-0">
              {columns.map((column) => {
                const value = row[column];
                const isAmount = column.includes("amount") || column.includes("revenue") || column.includes("spend");
                return (
                  <td key={column} className="whitespace-nowrap px-5 py-3">
                    {typeof value === "number" && isAmount ? value.toFixed(2) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildCsv(rows: Row[]) {
  const columns = Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
}

export default function AnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [range, setRange] = useState<RangeKey>("30d");
  const [role, setRole] = useState<RoleKey>("buyer");
  const [roles, setRoles] = useState<RoleState>({
    buyer: false,
    vendor: false,
    affiliate: false,
    referrals: false,
    jobs: false,
    admin: false,
  });
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [trend, setTrend] = useState<Point[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMetrics([]);
    setRows([]);
    setTrend([]);

    const selected = ranges.find((item) => item.key === range) ?? ranges[1];
    const { from, to, previousFrom, previousTo } = rangeBounds(selected.days);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      setError("Sign in to view analytics.");
      setLoading(false);
      return;
    }

    try {
      const { data: assigned, error: roleError } = await supabase
        .from("user_roles")
        .select("roles!inner(slug)")
        .eq("user_id", userId)
        .eq("status", "active");

      if (roleError) throw roleError;

      const slugs = (assigned ?? [])
        .map((item: any) => item.roles?.slug)
        .filter(Boolean) as string[];

      const nextRoles: RoleState = {
        buyer: slugs.includes("buyer"),
        vendor: slugs.includes("vendor"),
        affiliate: slugs.includes("affiliate"),
        referrals: slugs.some((slug) => ["buyer", "vendor", "affiliate"].includes(slug)),
        jobs: slugs.includes("job_employer") || slugs.includes("job_worker"),
        admin: slugs.some((slug) => slug.endsWith("_admin") || slug === "super_admin"),
      };
      setRoles(nextRoles);

      if (!nextRoles[role]) {
        const firstAvailable = rolesOrder.find((key) => nextRoles[key]);
        if (firstAvailable) {
          setRole(firstAvailable);
          setLoading(false);
          return;
        }
        setError("Your account does not have an analytics role.");
        setLoading(false);
        return;
      }

      if (role === "buyer") {
        const [currentOrders, previousOrders, favorites, activity, recommendations] = await Promise.all([
          supabase.from("orders").select("id,total,currency_code,created_at,status").eq("buyer_user_id", userId).gte("created_at", from).lte("created_at", to),
          supabase.from("orders").select("id,total,currency_code,created_at,status").eq("buyer_user_id", userId).gte("created_at", previousFrom).lte("created_at", previousTo),
          supabase.from("marketplace_item_favorites").select("item_id,created_at").eq("user_id", userId).gte("created_at", from).lte("created_at", to),
          supabase.from("discovery_events").select("event_type,created_at").eq("user_id", userId).gte("created_at", from).lte("created_at", to),
          supabase.from("recommendation_candidates").select("entity_id,score,reason,created_at").eq("user_id", userId).eq("status", "active").order("score", { ascending: false }).limit(10),
        ]);
        const queryError = [currentOrders.error, previousOrders.error, favorites.error, activity.error, recommendations.error].find(Boolean);
        if (queryError) throw queryError;

        const paidStatuses = ["paid", "processing", "completed"];
        const spend = (currentOrders.data ?? []).filter((order) => paidStatuses.includes(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0);
        const previousSpend = (previousOrders.data ?? []).filter((order) => paidStatuses.includes(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0);
        const currency = (currentOrders.data ?? []).map((order) => order.currency_code).filter(Boolean)[0] ?? "USD";
        const daily = new Map<string, number>();
        (activity.data ?? []).forEach((event) => {
          const day = event.created_at.slice(0, 10);
          daily.set(day, (daily.get(day) ?? 0) + 1);
        });

        setMetrics([
          { label: "Purchases", value: currentOrders.data?.length ?? 0, previous: previousOrders.data?.length ?? 0 },
          { label: "Spending", value: spend, previous: previousSpend, format: "money", currency },
          { label: "Saved products", value: favorites.data?.length ?? 0, previous: 0 },
          { label: "Activity events", value: activity.data?.length ?? 0, previous: 0 },
          { label: "Recommendations", value: recommendations.data?.length ?? 0, previous: 0 },
        ]);
        setTrend(Array.from(daily.entries()).sort().map(([label, value]) => ({ label, value })));
        setRows((recommendations.data ?? []).map((item) => ({ recommendation_id: item.entity_id, score: Number(item.score || 0), reason: item.reason || "—", created_at: item.created_at })));
      }

      if (role === "vendor") {
        const [items, currentSales, previousSales, currentEvents, previousEvents, campaigns] = await Promise.all([
          supabase.from("marketplace_items").select("id,title,public_id,status,created_at").eq("owner_user_id", userId),
          supabase.from("order_items").select("item_id,quantity,unit_price,currency_code,order_id,orders!inner(status,created_at)").eq("seller_user_id", userId).gte("orders.created_at", from).lte("orders.created_at", to),
          supabase.from("order_items").select("item_id,quantity,unit_price,currency_code,order_id,orders!inner(status,created_at)").eq("seller_user_id", userId).gte("orders.created_at", previousFrom).lte("orders.created_at", previousTo),
          supabase.from("discovery_events").select("entity_id,event_type,created_at").gte("created_at", from).lte("created_at", to),
          supabase.from("discovery_events").select("entity_id,event_type,created_at").gte("created_at", previousFrom).lte("created_at", previousTo),
          supabase.from("sponsored_listings").select("campaign_id,listing_id,status,created_at").eq("seller_user_id", userId).gte("created_at", from).lte("created_at", to),
        ]);
        const queryError = [items.error, currentSales.error, previousSales.error, currentEvents.error, previousEvents.error, campaigns.error].find(Boolean);
        if (queryError) throw queryError;

        const itemIds = new Set((items.data ?? []).map((item) => item.id));
        const ownEvents = (currentEvents.data ?? []).filter((event) => itemIds.has(event.entity_id));
        const previousOwnEvents = (previousEvents.data ?? []).filter((event) => itemIds.has(event.entity_id));
        const viewEvents = (events: any[]) => events.filter((event) => ["impression", "open"].includes(event.event_type)).length;
        const paidStatuses = ["paid", "processing", "completed"];
        const salesUnits = (currentSales.data ?? []).filter((sale: any) => paidStatuses.includes(sale.orders?.status)).reduce((sum: number, sale: any) => sum + Number(sale.quantity || 0), 0);
        const previousSalesUnits = (previousSales.data ?? []).filter((sale: any) => paidStatuses.includes(sale.orders?.status)).reduce((sum: number, sale: any) => sum + Number(sale.quantity || 0), 0);
        const revenue = (currentSales.data ?? []).filter((sale: any) => paidStatuses.includes(sale.orders?.status)).reduce((sum: number, sale: any) => sum + Number(sale.unit_price || 0) * Number(sale.quantity || 0), 0);
        const previousRevenue = (previousSales.data ?? []).filter((sale: any) => paidStatuses.includes(sale.orders?.status)).reduce((sum: number, sale: any) => sum + Number(sale.unit_price || 0) * Number(sale.quantity || 0), 0);
        const views = viewEvents(ownEvents);
        const previousViews = viewEvents(previousOwnEvents);
        const currency = (currentSales.data ?? []).map((sale: any) => sale.currency_code).filter(Boolean)[0] ?? "USD";
        const conversion = views ? (salesUnits / views) * 100 : 0;
        const previousConversion = previousViews ? (previousSalesUnits / previousViews) * 100 : 0;
        const daily = new Map<string, number>();
        ownEvents.filter((event) => ["impression", "open"].includes(event.event_type)).forEach((event) => {
          const day = event.created_at.slice(0, 10);
          daily.set(day, (daily.get(day) ?? 0) + 1);
        });

        setMetrics([
          { label: "Views", value: views, previous: previousViews },
          { label: "Sales", value: salesUnits, previous: previousSalesUnits },
          { label: "Conversion", value: conversion, previous: previousConversion, format: "percent" },
          { label: "Revenue", value: revenue, previous: previousRevenue, format: "money", currency },
          { label: "Products", value: items.data?.length ?? 0, previous: 0 },
          { label: "Campaigns", value: campaigns.data?.length ?? 0, previous: 0 },
        ]);
        setTrend(Array.from(daily.entries()).sort().map(([label, value]) => ({ label, value })));
        setRows((items.data ?? []).map((item) => ({
          public_id: item.public_id,
          product: item.title,
          status: item.status,
          views: ownEvents.filter((event) => event.entity_id === item.id && ["impression", "open"].includes(event.event_type)).length,
          sales: (currentSales.data ?? []).filter((sale: any) => sale.item_id === item.id).reduce((sum: number, sale: any) => sum + Number(sale.quantity || 0), 0),
        })));
      }

      if (role === "affiliate") {
        const { data: links, error: linksError } = await supabase.from("affiliate_links").select("id,item_id,code").eq("affiliate_user_id", userId);
        if (linksError) throw linksError;
        const linkIds = (links ?? []).map((link) => link.id);

        if (!linkIds.length) {
          setMetrics([
            { label: "Clicks", value: 0, previous: 0 },
            { label: "Conversions", value: 0, previous: 0 },
            { label: "Commission", value: 0, previous: 0, format: "money", currency: "USD" },
            { label: "Earnings", value: 0, previous: 0, format: "money", currency: "USD" },
            { label: "Conversion rate", value: 0, previous: 0, format: "percent" },
          ]);
        } else {
          const [clicks, previousClicks, attributions, previousAttributions, commissions, previousCommissions] = await Promise.all([
            supabase.from("affiliate_clicks").select("affiliate_link_id,created_at").in("affiliate_link_id", linkIds).gte("created_at", from).lte("created_at", to),
            supabase.from("affiliate_clicks").select("affiliate_link_id,created_at").in("affiliate_link_id", linkIds).gte("created_at", previousFrom).lte("created_at", previousTo),
            supabase.from("affiliate_attributions").select("affiliate_link_id,order_id,attribution_status,attributed_at").in("affiliate_link_id", linkIds).gte("attributed_at", from).lte("attributed_at", to),
            supabase.from("affiliate_attributions").select("affiliate_link_id,order_id,attribution_status,attributed_at").in("affiliate_link_id", linkIds).gte("attributed_at", previousFrom).lte("attributed_at", previousTo),
            supabase.from("commissions").select("item_id,commission_amount,currency_code,status,created_at").eq("affiliate_user_id", userId).gte("created_at", from).lte("created_at", to),
            supabase.from("commissions").select("item_id,commission_amount,currency_code,status,created_at").eq("affiliate_user_id", userId).gte("created_at", previousFrom).lte("created_at", previousTo),
          ]);
          const queryError = [clicks.error, previousClicks.error, attributions.error, previousAttributions.error, commissions.error, previousCommissions.error].find(Boolean);
          if (queryError) throw queryError;

          const confirmed = (attributions.data ?? []).filter((item) => item.attribution_status === "confirmed");
          const previousConfirmed = (previousAttributions.data ?? []).filter((item) => item.attribution_status === "confirmed");
          const eligibleStatuses = ["pending", "available", "paid"];
          const commission = (commissions.data ?? []).filter((item) => eligibleStatuses.includes(item.status)).reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
          const previousCommission = (previousCommissions.data ?? []).filter((item) => eligibleStatuses.includes(item.status)).reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
          const paid = (commissions.data ?? []).filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
          const previousPaid = (previousCommissions.data ?? []).filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
          const currency = commissions.data?.find((item) => item.currency_code)?.currency_code ?? "USD";

          setMetrics([
            { label: "Clicks", value: clicks.data?.length ?? 0, previous: previousClicks.data?.length ?? 0 },
            { label: "Conversions", value: confirmed.length, previous: previousConfirmed.length },
            { label: "Commission", value: commission, previous: previousCommission, format: "money", currency },
            { label: "Earnings", value: paid, previous: previousPaid, format: "money", currency },
            { label: "Conversion rate", value: clicks.data?.length ? (confirmed.length / clicks.data.length) * 100 : 0, previous: previousClicks.data?.length ? (previousConfirmed.length / previousClicks.data.length) * 100 : 0, format: "percent" },
          ]);
          setRows((links ?? []).map((link) => ({
            link: link.code,
            item_id: link.item_id,
            clicks: (clicks.data ?? []).filter((click) => click.affiliate_link_id === link.id).length,
            conversions: confirmed.filter((item) => item.affiliate_link_id === link.id).length,
          })));
        }
      }

      if (role === "referrals") {
        const [current, previous] = await Promise.all([
          supabase.from("referrals").select("id,status,reward_amount,created_at").eq("referrer_user_id", userId).gte("created_at", from).lte("created_at", to),
          supabase.from("referrals").select("id,status,reward_amount,created_at").eq("referrer_user_id", userId).gte("created_at", previousFrom).lte("created_at", previousTo),
        ]);
        if (current.error || previous.error) throw current.error || previous.error;
        const qualified = (data: any[]) => data.filter((item) => ["qualified", "completed", "rewarded"].includes(item.status)).length;
        const rewards = (data: any[]) => data.reduce((sum, item) => sum + Number(item.reward_amount || 0), 0);
        setMetrics([
          { label: "Invitations", value: current.data?.length ?? 0, previous: previous.data?.length ?? 0 },
          { label: "Qualified referrals", value: qualified(current.data ?? []), previous: qualified(previous.data ?? []) },
          { label: "Rewards", value: rewards(current.data ?? []), previous: rewards(previous.data ?? []), format: "money", currency: "USD" },
          { label: "Conversion", value: current.data?.length ? (qualified(current.data ?? []) / current.data.length) * 100 : 0, previous: previous.data?.length ? (qualified(previous.data ?? []) / previous.data.length) * 100 : 0, format: "percent" },
        ]);
        setTrend((current.data ?? []).reduce<Map<string, number>>((map, item) => {
          const day = item.created_at.slice(0, 10);
          map.set(day, (map.get(day) ?? 0) + 1);
          return map;
        }, new Map()).entries().sort().map(([label, value]) => ({ label, value })));
        setRows((current.data ?? []).map((item) => ({ referral_id: item.id, status: item.status, reward_amount: Number(item.reward_amount || 0), created_at: item.created_at })));
      }

      if (role === "jobs") {
        const [current, previous] = await Promise.all([
          supabase.from("jobs").select("id,title,views,created_at").eq("owner_user_id", userId).gte("created_at", from).lte("created_at", to),
          supabase.from("jobs").select("id,title,views,created_at").eq("owner_user_id", userId).gte("created_at", previousFrom).lte("created_at", previousTo),
        ]);
        if (current.error || previous.error) throw current.error || previous.error;
        const currentViews = (current.data ?? []).reduce((sum, job) => sum + Number(job.views || 0), 0);
        const previousViews = (previous.data ?? []).reduce((sum, job) => sum + Number(job.views || 0), 0);
        setMetrics([
          { label: "Jobs", value: current.data?.length ?? 0, previous: previous.data?.length ?? 0 },
          { label: "Views", value: currentViews, previous: previousViews },
        ]);
        setTrend((current.data ?? []).reduce<Map<string, number>>((map, job) => {
          const day = job.created_at.slice(0, 10);
          map.set(day, (map.get(day) ?? 0) + Number(job.views || 0));
          return map;
        }, new Map()).entries().sort().map(([label, value]) => ({ label, value })));
        setRows((current.data ?? []).map((job) => ({ job_id: job.id, title: job.title, views: Number(job.views || 0), created_at: job.created_at })));
      }

      if (role === "admin") {
        const [currentUsers, previousUsers, currentOrders, previousOrders] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", previousFrom).lte("created_at", previousTo),
          supabase.from("orders").select("id,total,currency_code,status,created_at").gte("created_at", from).lte("created_at", to),
          supabase.from("orders").select("id,total,currency_code,status,created_at").gte("created_at", previousFrom).lte("created_at", previousTo),
        ]);
        const queryError = [currentUsers.error, previousUsers.error, currentOrders.error, previousOrders.error].find(Boolean);
        if (queryError) throw queryError;
        const paidStatuses = ["paid", "processing", "completed"];
        const revenue = (currentOrders.data ?? []).filter((order) => paidStatuses.includes(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0);
        const previousRevenue = (previousOrders.data ?? []).filter((order) => paidStatuses.includes(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0);
        const currency = currentOrders.data?.find((order) => order.currency_code)?.currency_code ?? "USD";
        setMetrics([
          { label: "New users", value: currentUsers.count ?? 0, previous: previousUsers.count ?? 0 },
          { label: "Transactions", value: currentOrders.data?.length ?? 0, previous: previousOrders.data?.length ?? 0 },
          { label: "Revenue", value: revenue, previous: previousRevenue, format: "money", currency },
        ]);
        const daily = new Map<string, number>();
        (currentOrders.data ?? []).filter((order) => paidStatuses.includes(order.status)).forEach((order) => {
          const day = order.created_at.slice(0, 10);
          daily.set(day, (daily.get(day) ?? 0) + Number(order.total || 0));
        });
        setTrend(Array.from(daily.entries()).sort().map(([label, value]) => ({ label, value })));
        setRows((currentOrders.data ?? []).map((order) => ({ order_id: order.id, created_at: order.created_at, status: order.status, amount: Number(order.total || 0), currency: order.currency_code || "—" })));
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [range, role, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableRoles = rolesOrder.filter((key) => roles[key]);

  const exportCsv = () => {
    if (!rows.length) return;
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dright-${role}-analytics-${range}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Phase L</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Role-aware analytics from authenticated DRIGHT records. Metrics are calculated from live Supabase data only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!rows.length || loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-40">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1">
          {availableRoles.map((key) => (
            <button
              key={key}
              onClick={() => setRole(key)}
              className={`rounded-xl px-3 py-2 text-sm ${role === key ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "text-[var(--muted)] hover:bg-[var(--background)]"}`}
            >
              {roleLabels[key]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[var(--muted)]" />
          {ranges.map((item) => (
            <button
              key={item.key}
              onClick={() => setRange(item.key)}
              className={`rounded-lg px-3 py-1.5 text-xs ${range === item.key ? "bg-[var(--background)] font-semibold" : "text-[var(--muted)]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-[var(--surface)]" />)
          : metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Trend</p>
              <h2 className="mt-1 font-semibold">{ranges.find((item) => item.key === range)?.label} performance</h2>
            </div>
            <BarChart3 size={19} />
          </div>
          <div className="mt-3">
            <Sparkline points={trend} />
          </div>
          <div className="flex justify-between gap-3 overflow-x-auto text-[10px] text-[var(--muted)]">
            {trend.slice(0, 8).map((point) => <span key={point.label}>{point.label.slice(5)}</span>)}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Data scope</p>
          <h2 className="mt-1 font-semibold">Current access boundary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted)]">Role</span><span className="font-medium">{roleLabels[role]}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">Period</span><span>{ranges.find((item) => item.key === range)?.label}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">Rows available</span><span>{rows.length}</span></div>
          </div>
          <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
            Analytics use the authenticated Supabase client. Existing RLS policies remain the authorization boundary; this page does not elevate permissions or query another user&apos;s private records.
          </p>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="font-semibold">Drill-down</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Underlying records available to the authenticated role and selected period.</p>
        </div>
        <DataTable rows={rows} />
      </section>
    </div>
  );
}
