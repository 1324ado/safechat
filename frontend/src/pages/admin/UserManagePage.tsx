import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";

interface UserItem {
  id: string;
  username: string;
  role: string;
  avatar: string | null;
  created_at: string;
}

export function UserManagePage() {
  const [users, setUsers] = useState<UserItem[]>([]);

  useEffect(() => {
    api.get("/auth/users").then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">用户管理</h1>
        <p className="mt-1 text-sm text-slate-500">系统用户列表</p>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">用户列表</h2>
            <span className="text-sm text-slate-400 ml-auto">共 {users.length} 个用户</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">用户</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">角色</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <tr
                  key={u.id}
                  className={`border-b border-slate-100 transition-colors hover:bg-[#F9FAFB] ${
                    index % 2 === 1 ? "bg-slate-50/40" : ""
                  }`}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-semibold text-white overflow-hidden">
                        {u.avatar ? (
                          <img src={u.avatar} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                          u.username[0].toUpperCase()
                        )}
                      </div>
                      <span className="font-medium text-slate-900">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700">
                    {u.role === "admin" ? "管理员" : "用户"}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {new Date(u.created_at).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>暂无用户数据</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
