import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/services/api";

interface Keyword {
  id: string;
  word: string;
  category: string | null;
  created_at: string;
}

interface Category {
  category: string;
  count: number;
}

export function KeywordManagePage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [jumpPage, setJumpPage] = useState("");
  const pageSize = 14;
  const totalPages = Math.ceil(total / pageSize);

  const loadKeywords = () => {
    let url = `/admin/keywords?page=${page}&size=${pageSize}`;
    if (actualCategory) {
      url += `&category=${encodeURIComponent(actualCategory)}`;
    }
    api.get(url).then((r) => {
      setKeywords(r.data.keywords);
      setTotal(r.data.total);
    }).catch(() => {});
  };

  const loadCategories = () => {
    api.get("/admin/keywords/categories").then((r) => setCategories(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [selectedCategory, page]);

  const actualCategory = selectedCategory === "all" ? "" : selectedCategory;

  const filteredKeywords = searchQuery.trim()
    ? keywords.filter((kw) => kw.word.includes(searchQuery.trim()))
    : keywords;

  const handleJump = () => {
    const num = parseInt(jumpPage);
    if (num >= 1 && num <= totalPages) {
      setPage(num);
      setJumpPage("");
    }
  };

  const handleAdd = async () => {
    if (!newWord.trim()) return;
    try {
      await api.post("/admin/keywords", { word: newWord.trim(), category: newCategory.trim() || null });
      setNewWord("");
      setNewCategory("");
      toast.success("添加成功");
      setPage(1);
      loadKeywords();
      loadCategories();
    } catch {
      toast.error("添加失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/keywords/${id}`);
      toast.success("删除成功");
      loadKeywords();
      loadCategories();
    } catch {
      toast.error("删除失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">关键词库</h1>
        <p className="mt-1 text-sm text-slate-500">管理安全过滤关键词</p>
      </div>

      {/* Add Keyword Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">添加关键词</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex gap-3">
            <Input
              placeholder="关键词"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="分类（可选）"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="max-w-xs"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat.category} value={cat.category} />
              ))}
            </datalist>
            <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
        </div>
      </div>

      {/* Keyword List Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-semibold text-slate-900">关键词列表</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索关键词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-300 w-40"
                />
              </div>
              <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setPage(1); }}>
                <SelectTrigger className="w-[160px] rounded-2xl border-slate-200">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all" className="rounded-xl">全部分类</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category} value={cat.category} className="rounded-xl">
                      {cat.category} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">关键词</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">分类</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">添加时间</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeywords.map((kw, index) => (
                <tr
                  key={kw.id}
                  className={`border-b border-slate-100 transition-colors hover:bg-[#F9FAFB] ${
                    index % 2 === 1 ? "bg-slate-50/40" : ""
                  }`}
                >
                  <td className="px-6 py-3.5 font-medium text-slate-900">{kw.word}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant="secondary" className="rounded-full text-[11px] font-medium">
                      {kw.category || "未分类"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-xs">
                    {new Date(kw.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(kw.id)}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredKeywords.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Key className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>暂无关键词</p>
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
