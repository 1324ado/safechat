import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  FileText,
  Key,
  LogOut,
  Palette,
  Users,
  MessageSquare,
  Shield,
  ChevronLeft,
  ArrowRightLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { path: "/admin/dashboard", label: "仪表盘", icon: BarChart3 },
  { path: "/admin/audit", label: "审核日志", icon: FileText },
  { path: "/admin/users", label: "用户管理", icon: Users },
  { path: "/admin/styles", label: "风格管理", icon: Palette },
  { path: "/admin/keywords", label: "关键词库", icon: Key },
  { path: "/admin/style-switches", label: "切换记录", icon: ArrowRightLeft },
];

const breadcrumbMap: Record<string, string> = {
  dashboard: "仪表盘",
  audit: "审核日志",
  users: "用户管理",
  styles: "风格管理",
  keywords: "关键词库",
  "style-switches": "切换记录",
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    navigate("/chat");
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentSection = pathSegments[1] || "dashboard";

  return (
    <div className="flex h-screen bg-[#F3F4F6]">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-[#111827] text-white/70">
        <div className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6] text-sm font-semibold text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">管理后台</div>
              <div className="text-xs text-white/50">Style Safety</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-white/10 transition-colors"
            onClick={() => navigate("/chat")}
          >
            <MessageSquare className="h-4 w-4" />
            返回聊天
          </button>
          <div className="my-2 border-t border-white/10" />
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.path.split("/")[2];
            return (
              <button
                key={item.path}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#3B82F6]/20 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => navigate(item.path)}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#60A5FA]" : "text-white/40"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 pb-5">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-semibold text-white overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.username}</div>
              <div className="text-[10px] text-white/40">管理员</div>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-white transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/chat")}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                返回
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <nav className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">首页</span>
                <span className="text-slate-300">/</span>
                <span className="font-medium text-slate-700">
                  {breadcrumbMap[currentSection] || currentSection}
                </span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-indigo-600">
                      {user?.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700">{user?.username}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="mx-auto max-w-[1600px] px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
