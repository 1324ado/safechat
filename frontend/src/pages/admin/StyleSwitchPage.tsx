import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { api } from "@/services/api";

interface StyleSwitch {
  id: string;
  username: string;
  from_style: string;
  to_style: string;
  created_at: string;
}

export function StyleSwitchPage() {
  const [switches, setSwitches] = useState<StyleSwitch[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [jumpPage, setJumpPage] = useState("");
  const pageSize = 14;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    api.get(`/admin/stats/style-switches?page=${page}&size=${pageSize}`)
      .then((r) => {
        setSwitches(r.data.switches);
        setTotal(r.data.total);
      })
      .catch(() => {});
  }, [page]);

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
        <h1 className="text-2xl font-semibold text-slate-900">风格切换记录</h1>
        <p className="mt-1 text-sm text-slate-500">用户在对话中的风格切换历史</p>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">切换记录</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">时间</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">用户</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">原风格</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500"></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">新风格</th>
              </tr>
            </thead>
            <tbody>
              {switches.map((sw, index) => (
                <tr
                  key={sw.id}
                  className={`border-b border-slate-100 transition-colors hover:bg-[#F9FAFB] ${
                    index % 2 === 1 ? "bg-slate-50/40" : ""
                  }`}
                >
                  <td className="px-6 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(sw.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-6 py-3.5 text-slate-700 font-medium">{sw.username}</td>
                  <td className="px-6 py-3.5 text-slate-700">{sw.from_style}</td>
                  <td className="px-6 py-3.5 text-slate-400">
                    <ArrowRightLeft className="h-4 w-4" />
                  </td>
                  <td className="px-6 py-3.5 text-indigo-600 font-medium">{sw.to_style}</td>
                </tr>
              ))}
              {switches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>暂无切换记录</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
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
                onBlur={() => { if (jumpPage) handleJump(); else setJumpPage(""); }}
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
