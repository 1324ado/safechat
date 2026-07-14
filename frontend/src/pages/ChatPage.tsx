import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LogOut,
  MessageSquarePlus,
  Send,
  Shield,
  Sparkles,
  Bot,
  User,
  Camera,
  LayoutDashboard,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/services/api";
import { AvatarCropModal } from "@/components/AvatarCropModal";

export function ChatPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { user, logout, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const isComposingRef = useRef(false);
  const {
    conversations,
    messages,
    styles,
    currentStyle,
    isLoading,
    isStreaming,
    streamingContent,
    fetchConversations,
    fetchStyles,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    setCurrentStyle,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchStyles();
  }, []);

  useEffect(() => {
    if (sessionId) {
      selectConversation(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    try {
      await sendMessage(text);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleNewChat = async () => {
    const id = await createConversation();
    if (id) {
      navigate(`/chat/${id}`);
    }
  };

  const handleSelectConv = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    const formData = new FormData();
    formData.append("file", croppedBlob, "avatar.png");
    try {
      const { data } = await api.post("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser({ avatar: data.avatar });
      toast.success("头像更新成功");
    } catch {
      toast.error("头像上传失败");
    }
  };

  const handleCropCancel = () => {
    setCropImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const currentStyleObj = styles.find((s) => s.identifier === currentStyle);

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        (c.title || "新对话").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const hasContent = input.trim().length > 0;

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      {/* Sidebar */}
      <aside className="flex w-[280px] flex-shrink-0 flex-col bg-[#FAFAFA] border-r border-[#F0F0F0] p-3">
        {/* Brand */}
        <div className="border-b border-[#F0F0F0] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3B82F6]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-[#1A1A1A]">风格安全助手</p>
              <p className="text-xs text-[#999999]">Style Safety</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="py-3 space-y-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            onClick={handleNewChat}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#60A5FA] to-[#2563EB] text-white shadow-md">
              <MessageSquarePlus className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-[#1F2937]">新建对话</span>
              <span className="block text-xs text-[#94A3B8]">从空白开始</span>
            </span>
          </button>
          {user?.role === "admin" && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-3 py-1.5 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-[#3B82F6]/20"
              onClick={() => navigate("/admin")}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              管理后台
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索对话..."
              className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#93C5FD] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Session List */}
        <div className="relative flex-1 min-h-0">
          <div className="h-full overflow-y-auto sidebar-scroll">
            {filteredConversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-[#999999]">
                <MessageSquarePlus className="h-12 w-12 mb-2" />
                <p className="text-sm">暂无对话记录</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                      sessionId === conv.id
                        ? "bg-[#DBEAFE] text-[#2563EB]"
                        : "text-[#333333] hover:bg-[#F5F5F5]"
                    }`}
                    onClick={() => handleSelectConv(conv.id)}
                  >
                    <span className="flex-1 truncate font-normal">
                      {conv.title || "新对话"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id)
                          .then(() => {
                            toast.success("对话已删除");
                            if (sessionId === conv.id) {
                              navigate("/chat");
                            }
                          })
                          .catch((err) => {
                            console.error("Delete error:", err);
                            toast.error(err.response?.data?.detail || "删除失败");
                          });
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[#999999] hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-b from-transparent to-[#FAFAFA]"
          />
        </div>

        {/* User Profile */}
        <div className="mt-auto pt-3 border-t border-[#F0F0F0]">
          <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#F5F5F5]">
            <div className="relative group">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B82F6] text-white overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-medium">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-3.5 w-3.5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#1A1A1A] truncate">
                {user?.username}
              </div>
              <div className="text-[10px] text-[#999999]">
                {user?.role === "admin" ? "管理员" : "用户"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#999999] hover:text-red-500 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#F0F0F0] bg-white/80 backdrop-blur px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium text-[#1A1A1A]">安全对话</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <Select value={currentStyle} onValueChange={setCurrentStyle}>
              <SelectTrigger className="w-auto rounded-2xl border-[#E5E7EB] gap-1.5">
                <SelectValue placeholder="选择风格" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {styles.map((s) => (
                  <SelectItem key={s.identifier} value={s.identifier} className="rounded-xl">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Messages or Welcome */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isStreaming ? (
            /* Welcome Screen */
            <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-16">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-32 right-[-40px] h-72 w-72 rounded-full bg-gradient-radial from-[#BFDBFE]/60 via-transparent to-transparent blur-3xl"
              />
              <div className="relative w-full max-w-[860px]">
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-[#2563EB] shadow-sm">
                    <Bot className="h-3.5 w-3.5" />
                    风格安全对话助手
                  </span>
                  <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#111827] sm:text-5xl">
                    开始你的
                    <span className="text-gradient">风格对话</span>
                  </h1>
                  <p className="mt-4 text-base text-[#4B5563] sm:text-lg">
                    选择风格、安全过滤、智能助手，体验多风格对话
                  </p>
                </div>

                <div className="mt-10">
                  <div
                    className={`relative flex flex-col rounded-3xl border border-white/70 bg-white/80 px-5 pt-4 pb-3 shadow-[0_24px_60px_-30px_rgba(10,10,15,0.65)] backdrop-blur-xl transition-all duration-200 ${
                      isFocused
                        ? "border-[#BFDBFE] shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_16px_40px_rgba(59,130,246,0.25)]"
                        : "hover:border-[#D4D4D4]"
                    }`}
                  >
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="输入你的问题..."
                      className="max-h-40 min-h-[52px] w-full resize-none border-0 bg-transparent px-2 pt-2 pb-2 text-[15px] text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none"
                      rows={1}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onCompositionStart={() => {
                        isComposingRef.current = true;
                      }}
                      onCompositionEnd={() => {
                        isComposingRef.current = false;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          const nativeEvent = e.nativeEvent as KeyboardEvent;
                          if (
                            nativeEvent.isComposing ||
                            isComposingRef.current ||
                            nativeEvent.keyCode === 229
                          ) {
                            return;
                          }
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <div className="mt-3 flex items-center">
                      <span className="text-xs text-[#999999]">
                        <kbd className="rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[#666666]">
                          Enter
                        </kbd>{" "}
                        发送
                        <span className="px-1.5">·</span>
                        <kbd className="rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[#666666]">
                          Shift + Enter
                        </kbd>{" "}
                        换行
                      </span>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!hasContent}
                        className={`ml-auto rounded-full p-2.5 transition-all duration-200 ${
                          hasContent
                            ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                            : "cursor-not-allowed bg-[#F5F5F5] text-[#CCCCCC]"
                        }`}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.24em] text-[#94A3B8]">
                    <span className="h-px w-8 bg-[#E5E7EB]" />
                    当前风格
                    <span className="h-px w-8 bg-[#E5E7EB]" />
                  </div>
                  <div className="mt-5 flex justify-center">
                    <div className="rounded-2xl border border-[#BFDBFE] bg-[#DBEAFE] px-6 py-4 text-center">
                      <p className="text-lg font-semibold text-[#2563EB]">
                        {currentStyleObj?.name || "默认"}
                      </p>
                      <p className="mt-1 text-sm text-[#3B82F6]">
                        {currentStyleObj?.identifier || "default"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" ? (
                    <div className="user-message max-w-[80%]">
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6] text-white">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="prose prose-gray max-w-none break-words leading-[1.6] prose-headings:text-[#1A1A1A] prose-p:text-[#333333] prose-p:leading-relaxed prose-li:text-[#333333] prose-strong:text-[#1A1A1A] prose-a:text-[#0969da]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6] text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="prose prose-gray max-w-none break-words leading-[1.6] prose-headings:text-[#1A1A1A] prose-p:text-[#333333] prose-p:leading-relaxed prose-li:text-[#333333] prose-strong:text-[#1A1A1A] prose-a:text-[#0969da]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {isStreaming && !streamingContent && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6] text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="ai-wait" aria-label="思考中">
                      <span className="ai-wait-dots" aria-hidden="true">
                        <span className="ai-wait-dot" />
                        <span className="ai-wait-dot" />
                        <span className="ai-wait-dot" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input (shown when there are messages) */}
        {messages.length > 0 && (
          <div className="border-t border-[#F0F0F0] bg-white/80 backdrop-blur px-4 py-4">
            <div className="mx-auto max-w-3xl">
              <div
                className={`relative flex flex-col rounded-2xl border bg-white px-4 pt-3 pb-2 transition-all duration-200 ${
                  isFocused
                    ? "border-[#D4D4D4] shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                    : "border-[#E5E5E5] hover:border-[#D4D4D4]"
                }`}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入你的问题..."
                  className="max-h-40 min-h-[44px] w-full resize-none border-0 bg-transparent px-2 pt-2 pb-2 text-[15px] text-[#333333] placeholder:text-[#999999] focus:outline-none focus-visible:ring-0"
                  rows={1}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    isComposingRef.current = false;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      const nativeEvent = e.nativeEvent as KeyboardEvent;
                      if (
                        nativeEvent.isComposing ||
                        isComposingRef.current ||
                        nativeEvent.keyCode === 229
                      ) {
                        return;
                      }
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <div className="relative mt-2 flex items-center">
                  <span className="text-xs text-[#999999]">
                    <kbd className="rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[#666666]">
                      Enter
                    </kbd>{" "}
                    发送
                    <span className="px-1.5">·</span>
                    <kbd className="rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[#666666]">
                      Shift + Enter
                    </kbd>{" "}
                    换行
                  </span>
                  <button
                    type="button"
                    onClick={isStreaming ? () => {} : handleSend}
                    disabled={!hasContent && !isStreaming}
                    className={`ml-auto rounded-full p-2.5 transition-all duration-200 ${
                      isStreaming
                        ? "bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FECACA]"
                        : hasContent
                          ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                          : "cursor-not-allowed bg-[#F5F5F5] text-[#CCCCCC]"
                    }`}
                  >
                    {isStreaming ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onCancel={handleCropCancel}
          onConfirm={(blob) => {
            void handleCropConfirm(blob);
          }}
        />
      )}
    </div>
  );
}
