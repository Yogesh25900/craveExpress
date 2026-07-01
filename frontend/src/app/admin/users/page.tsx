"use client";

import { useEffect, useState } from "react";
import { Search, Shield, Store, User, Ban, ChevronDown } from "lucide-react";
import { adminApi } from "@/lib/api";

interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "user" | "owner" | "admin";
  isBanned: boolean;
  restaurantSlug?: string;
  createdAt: string;
}

type RoleFilter = "all" | "user" | "owner" | "admin";

const ROLE_STYLE: Record<AdminUser["role"], string> = {
  admin: "bg-orange-100 text-orange-700",
  owner: "bg-purple-100 text-purple-700",
  user:  "bg-gray-100 text-gray-600",
};
const ROLE_ICON: Record<AdminUser["role"], React.ElementType> = {
  admin: Shield, owner: Store, user: User,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-500","bg-purple-500","bg-green-500","bg-pink-500","bg-indigo-500",
  "bg-rose-500","bg-teal-500","bg-amber-500","bg-cyan-500","bg-lime-500",
];

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [roleFilter, setRole]   = useState<RoleFilter>("all");
  const [roleMenu, setRoleMenu] = useState<string | null>(null);

  useEffect(() => {
    adminApi.users({ limit: "200" })
      .then((res) => setUsers((res.users as AdminUser[]) ?? []))
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  async function changeRole(id: string, role: AdminUser["role"]) {
    setRoleMenu(null);
    try {
      const res = await adminApi.updateUserRole(id, role);
      const updated = res.user as AdminUser;
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, role: updated.role } : u));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function toggleBan(id: string) {
    try {
      const res = await adminApi.banUser(id);
      const updated = res.user as AdminUser;
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isBanned: updated.isBanned } : u));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchText = !search || u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchText;
  });

  const counts = {
    all:   users.length,
    user:  users.filter((u) => u.role === "user").length,
    owner: users.filter((u) => u.role === "owner").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} registered accounts</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 w-56" />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      <div className="flex gap-1 flex-wrap">
        {(["all","user","owner","admin"] as const).map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${roleFilter === r ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-orange-400"}`}>
            {r} ({counts[r]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Phone</th>
                <th className="px-3 py-3 text-left">Role</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Joined</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user, idx) => {
                const RoleIcon = ROLE_ICON[user.role];
                const isBanned = user.isBanned;
                return (
                  <tr key={user._id} className={`hover:bg-gray-50 transition-colors ${isBanned ? "opacity-60" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          {getInitials(user.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{user.fullName}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-gray-500 text-xs hidden sm:table-cell">{user.phone}</td>
                    <td className="px-3 py-3.5">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setRoleMenu(roleMenu === user._id ? null : user._id)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_STYLE[user.role]}`}
                        >
                          <RoleIcon size={10} /> {user.role} <ChevronDown size={10} />
                        </button>
                        {roleMenu === user._id && (
                          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[100px] overflow-hidden">
                            {(["user","owner","admin"] as const).map((r) => (
                              <button key={r} onClick={() => changeRole(user._id, r)}
                                className={`w-full px-3 py-2 text-left text-xs font-medium capitalize hover:bg-gray-50 ${user.role === r ? "text-orange-500 font-bold" : "text-gray-700"}`}>
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {user.restaurantSlug && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{user.restaurantSlug}</p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-gray-400 text-xs hidden lg:table-cell">{fmt(user.createdAt)}</td>
                    <td className="px-3 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isBanned ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                        {isBanned ? "banned" : "active"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {user.role !== "admin" && (
                        <button
                          onClick={() => toggleBan(user._id)}
                          className={`flex items-center gap-1 ml-auto text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                            isBanned
                              ? "border-green-300 text-green-600 hover:bg-green-50"
                              : "border-red-200 text-red-500 hover:bg-red-50"
                          }`}
                        >
                          <Ban size={11} /> {isBanned ? "Unban" : "Ban"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No users match your search</div>
        )}
      </div>
    </div>
  );
}
