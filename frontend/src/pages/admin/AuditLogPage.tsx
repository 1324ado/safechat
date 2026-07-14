import { useEffect, useState } from "react";
import { Shield, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services/api";

interface AuditLog {
  id: string;
  user_id: string | null;
  username: string;
  direction: string;
  layer: string;
  original_text: string;
  category: string | null;
  reason: string | null;
  created_at: string;
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [jumpPage, setJumpPage] = useState("");
  const [layerFilter, setLayerFilter] = useState<string>("");
  const pageSize = 14;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    let url = `/admin/audit-logs?page=${page}&size=${pageSize}`;
    if (layerFilter) url += `&layer=${layerFilter}`;
    api.get(url).then((r) => {
      setLogs(r.data.logs);
      setTotal(r.data.total);
    }).catch(() => {});
  }, [page, layerFilter]);

  const handleJump = () => {
    const num = parseInt(jumpPage);
    if (num >= 1 && num <= totalPages) {
      setPage(num);
      setJumpPage("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">审核日志</h1>
        <p className="mt-1 text-sm text-slate-500">违规拦截记录</p>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-semibold text-slate-900">拦截记录</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={layerFilter || "all"} onValueChange={(v) => { setLayerFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[140px] rounded-2xl border-slate-200">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all" className="rounded-xl">全部类型</SelectItem>
                  <SelectItem value="keyword" className="rounded-xl">关键词拦截</SelectItem>
                  <SelectItem value="model" className="rounded-xl">模型拦截</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto" style={{ tableLayout: 'fixed', width: '100%' }}>
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">用户</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">方向</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">拦截层</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 min-w-[200px]">原始内容</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 min-w-[200px]">原因</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr
                  key={log.id}
                  className={`border-b border-slate-100 transition-colors hover:bg-[#F9FAFB] ${
                    index % 2 === 1 ? "bg-slate-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium whitespace-nowrap">{log.username}</td>
                  <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{log.direction === "request" ? "请求" : "响应"}</td>
                  <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{log.layer === "keyword" ? "关键词" : "模型"}</td>
                  <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{log.category || "-"}</td>
                  <td className="px-4 py-3.5 text-slate-700 max-w-[300px] truncate" title={log.original_text}>{log.original_text}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[250px] truncate" title={log.reason}>{log.reason || "-"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>暂无拦截记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <div className="text-sm text-slate-500">
              共 <span className="font-medium text-slate-700">{total}</span> 条记录，
              <span className="font-medium text-slate-700">{totalPages}</span> 页
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <input
                type="text"
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value.replace(/\D/g, ""))}
                onBlur={() => {
                  if (jumpPage) {
                    handleJump();
                  } else {
                    setJumpPage("");
                  }
                }}
                onFocus={() => setJumpPage(String(page))}
                onKeyDown={(e) => e.key === "Enter" && handleJump()}
                placeholder={String(page)}
                className="w-12 h-8 rounded border border-slate-200 px-2 text-sm text-center focus:outline-none focus:border-indigo-300"
              />
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
