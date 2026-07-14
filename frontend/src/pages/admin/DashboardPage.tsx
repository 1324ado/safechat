import { useEffect, useState } from "react";
import { BarChart3, MessageSquare, Shield, TrendingUp, Clock, MessageCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";

interface Overview {
  total_conversations: number;
  total_messages: number;
  total_blocks: number;
  block_rate: number;
}

interface Activity {
  type: string;
  id: string;
  title?: string;
  username: string;
  layer?: string;
  category?: string;
  original_text?: string;
  created_at: string;
}

export function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    api.get("/admin/stats/overview").then((r) => setOverview(r.data)).catch(() => {});
    api.get("/admin/stats/recent").then((r) => setActivities(r.data)).catch(() => {});
  }, []);

  const stats = [
    {
      label: "总对话数",
      value: overview?.total_conversations ?? 0,
      icon: MessageSquare,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "总消息数",
      value: overview?.total_messages ?? 0,
      icon: BarChart3,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "拦截总数",
      value: overview?.total_blocks ?? 0,
      icon: Shield,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "拦截率",
      value: `${overview?.block_rate ?? 0}%`,
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">仪表盘</h1>
        <p className="mt-1 text-sm text-slate-500">系统运行概览</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="relative flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div>
                <div className="text-xs font-medium text-slate-500">{stat.label}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">最近活动</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">系统最近的对话和拦截记录</p>
        </div>
        <div className="divide-y divide-slate-100">
          {activities.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-slate-400">
              <p className="text-sm">暂无最近活动数据</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  activity.type === "conversation"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-red-50 text-red-600"
                }`}>
                  {activity.type === "conversation" ? (
                    <MessageCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {activity.type === "conversation"
                        ? activity.title || "新对话"
                        : `${activity.layer === "keyword" ? "关键词" : "模型"}拦截`}
                    </span>
                    {activity.category && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {activity.category}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {activity.username} · {new Date(activity.created_at).toLocaleString("zh-CN")}
                  </div>
                  {activity.original_text && (
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {activity.original_text}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
