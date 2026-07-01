"use client";

import { useEffect, useState } from "react";
import { Download, Search, CreditCard, Banknote, TrendingUp } from "lucide-react";
import { adminApi } from "@/lib/api";

interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  restaurantName: string;
  amount: number;
  method: string;
  status: "paid" | "refunded" | "failed";
  date: string;
}

interface Stats {
  totalRevenue: number;
  todayRevenue: number;
}

type MethodFilter = "all" | "card" | "cash";
type StatusFilter = "all" | "paid" | "refunded" | "failed";

const STATUS_STYLE: Record<Transaction["status"], string> = {
  paid:     "bg-green-100 text-green-700",
  refunded: "bg-amber-100 text-amber-700",
  failed:   "bg-red-100 text-red-600",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isCash(method: string) {
  return method === "cash" || method === "cod";
}

export default function AdminTransactionsPage() {
  const [txns, setTxns]           = useState<Transaction[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [methodFilter, setMethod] = useState<MethodFilter>("all");
  const [statusFilter, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    Promise.all([adminApi.transactions(), adminApi.stats()])
      .then(([t, s]) => {
        setTxns((t.transactions as Transaction[]) ?? []);
        setStats(s.stats as Stats);
      })
      .catch(() => setError("Failed to load transactions"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = txns.filter((t) => {
    const matchMethod = methodFilter === "all"
      || (methodFilter === "card" && t.method === "card")
      || (methodFilter === "cash" && isCash(t.method));
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchText   = !search
      || t.customerName.toLowerCase().includes(search.toLowerCase())
      || t.orderNumber.toLowerCase().includes(search.toLowerCase());
    return matchMethod && matchStatus && matchText;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const paidTxns    = txns.filter((t) => t.status === "paid");
  const cardTotal   = paidTxns.filter((t) => t.method === "card").reduce((s, t) => s + t.amount, 0);
  const cashTotal   = paidTxns.filter((t) => isCash(t.method)).reduce((s, t) => s + t.amount, 0);
  const refundTotal = txns.filter((t) => t.status === "refunded").reduce((s, t) => s + t.amount, 0);
  const cardCount   = paidTxns.filter((t) => t.method === "card").length;
  const cashCount   = paidTxns.filter((t) => isCash(t.method)).length;

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{txns.length} payment records</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-lg transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: "Total Revenue",  value: stats ? `$${stats.totalRevenue.toLocaleString()}` : "—",  sub: "All time",              color: "bg-green-50 text-green-600"   },
          { icon: TrendingUp, label: "Today Revenue",  value: stats ? `$${stats.todayRevenue.toFixed(2)}` : "—",         sub: "Today",                 color: "bg-orange-50 text-orange-500" },
          { icon: CreditCard, label: "Card Payments",  value: `$${cardTotal.toFixed(2)}`,                                sub: `${cardCount} transactions`, color: "bg-blue-50 text-blue-600" },
          { icon: Banknote,   label: "Cash Payments",  value: `$${cashTotal.toFixed(2)}`,                                sub: `${cashCount} transactions`, color: "bg-purple-50 text-purple-600" },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon size={18} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 w-44" />
        </div>
        <div className="flex gap-1">
          {(["all","card","cash"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${methodFilter === m ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-orange-400"}`}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all","paid","refunded","failed"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-orange-400"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Transaction ID</th>
                <th className="px-3 py-3 text-left">Order</th>
                <th className="px-3 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Restaurant</th>
                <th className="px-3 py-3 text-left">Method</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5"><span className="font-mono text-xs text-gray-500">{t.id}</span></td>
                  <td className="px-3 py-3.5"><span className="font-mono text-xs font-bold text-gray-500">#{t.orderNumber}</span></td>
                  <td className="px-3 py-3.5 font-medium text-gray-800">{t.customerName}</td>
                  <td className="px-3 py-3.5 text-gray-500 text-xs hidden md:table-cell">{t.restaurantName}</td>
                  <td className="px-3 py-3.5">
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      {isCash(t.method) ? <Banknote size={11} /> : <CreditCard size={11} />}
                      {isCash(t.method) ? "Cash" : "Card"}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right font-bold text-gray-800">${t.amount.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-gray-400 hidden sm:table-cell">{fmt(t.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">No transactions found</div>}

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">{filtered.length} transactions</span>
          <div className="text-sm font-bold text-gray-800">
            Showing: ${filtered.filter((t) => t.status === "paid").reduce((s, t) => s + t.amount, 0).toFixed(2)}
            {refundTotal > 0 && <span className="text-amber-600 ml-2 text-xs font-semibold">−${refundTotal.toFixed(2)} refunded</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
