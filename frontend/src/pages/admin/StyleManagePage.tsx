import { useEffect, useState } from "react";
import { Palette, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/services/api";

interface Style {
  id: string;
  name: string;
  identifier: string;
  system_prompt: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  is_builtin: boolean;
}

export function StyleManagePage() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    identifier: "",
    system_prompt: "",
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2048,
  });

  const loadStyles = () => {
    api.get("/styles").then((r) => setStyles(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadStyles();
  }, []);

  const resetForm = () => {
    setForm({ name: "", identifier: "", system_prompt: "", temperature: 0.7, top_p: 0.9, max_tokens: 2048 });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (style: Style) => {
    setForm({
      name: style.name,
      identifier: style.identifier,
      system_prompt: style.system_prompt,
      temperature: style.temperature,
      top_p: style.top_p,
      max_tokens: style.max_tokens,
    });
    setEditingId(style.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.identifier.trim() || !form.system_prompt.trim()) {
      toast.error("请填写所有必填字段");
      return;
    }
    try {
      if (editingId) {
        await api.put(`/styles/${editingId}`, form);
        toast.success("更新成功");
      } else {
        await api.post("/styles", form);
        toast.success("创建成功");
      }
      resetForm();
      loadStyles();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "操作失败");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除风格"${name}"吗？`)) return;
    try {
      await api.delete(`/styles/${id}`);
      toast.success("删除成功");
      loadStyles();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "删除失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">风格管理</h1>
          <p className="mt-1 text-sm text-slate-500">对话风格模板</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          添加风格
        </Button>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">风格列表</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">名称</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">标识</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Temperature</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Top P</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">类型</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {styles.map((s, index) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-100 transition-colors hover:bg-[#F9FAFB] ${
                    index % 2 === 1 ? "bg-slate-50/40" : ""
                  }`}
                >
                  <td className="px-6 py-3.5 font-medium text-slate-900">{s.name}</td>
                  <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{s.identifier}</td>
                  <td className="px-6 py-3.5 text-slate-700">{s.temperature}</td>
                  <td className="px-6 py-3.5 text-slate-700">{s.top_p}</td>
                  <td className="px-6 py-3.5 text-slate-700">
                    {s.is_builtin ? "内置" : "自定义"}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(s)}
                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!s.is_builtin && (
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {styles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Palette className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p>暂无风格数据</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId ? "编辑风格" : "添加风格"}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">名称 *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如：教师辅导"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">标识 *</label>
                  <Input
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    placeholder="如：teacher"
                    className="mt-1"
                    disabled={!!editingId}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">系统提示词 *</label>
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                  placeholder="输入系统提示词..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-300 min-h-[120px]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Temperature</label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Top P</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={form.top_p}
                    onChange={(e) => setForm({ ...form, top_p: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={resetForm}>取消</Button>
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                <Check className="h-4 w-4 mr-1" />
                {editingId ? "保存" : "创建"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
