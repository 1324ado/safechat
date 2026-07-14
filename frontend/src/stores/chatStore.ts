import { create } from "zustand";
import { api } from "@/services/api";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  style_id: string | null;
  created_at: string;
}

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

interface ChatState {
  conversations: Conversation[];
  currentConvId: string | null;
  messages: Message[];
  styles: Style[];
  currentStyle: string;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;

  fetchConversations: () => Promise<void>;
  fetchStyles: () => Promise<void>;
  createConversation: (force?: boolean) => Promise<string | null>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setCurrentStyle: (identifier: string) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  currentConvId: null,
  messages: [],
  styles: [],
  currentStyle: localStorage.getItem("currentStyle") || "teacher",
  isLoading: false,
  isStreaming: false,
  streamingContent: "",

  fetchConversations: async () => {
    const { data } = await api.get("/chat/conversations");
    set({ conversations: data });
  },

  fetchStyles: async () => {
    const { data } = await api.get("/styles");
    set({ styles: data });
  },

  createConversation: async (force = false) => {
    const { currentConvId, messages } = get();
    // 如果当前已经是空对话（没有convId或有convId但没消息），不创建新的
    if (!force && messages.length === 0) {
      return currentConvId;
    }
    // 后端会检查是否已有空对话，有则返回已有的
    const { data } = await api.post("/chat/conversations");
    set((s) => {
      // 检查是否已存在该对话
      const exists = s.conversations.some((c) => c.id === data.id);
      return {
        conversations: exists ? s.conversations : [data, ...s.conversations],
        currentConvId: data.id,
        messages: [],
      };
    });
    return data.id;
  },

  selectConversation: async (id: string) => {
    set({ currentConvId: id, messages: [], isLoading: true });
    try {
      const { data } = await api.get(`/chat/conversations/${id}/messages`);
      set({ messages: data });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id: string) => {
    await api.delete(`/chat/conversations/${id}`);
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      currentConvId: s.currentConvId === id ? null : s.currentConvId,
      messages: s.currentConvId === id ? [] : s.messages,
    }));
  },

  sendMessage: async (content: string) => {
    const { currentConvId, currentStyle } = get();
    let convId = currentConvId;

    if (!convId) {
      const newId = await get().createConversation(true);
      convId = newId || undefined;
    }

    // 先显示loading状态，不添加用户消息
    set({ isStreaming: true, streamingContent: "" });

    try {
      const token = useAuthStore.getState().accessToken;
      const response = await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, style_identifier: currentStyle }),
      });

      if (!response.ok) {
        let detail = "发送失败";
        try {
          const err = await response.json();
          detail = err.detail || detail;
        } catch {}
        throw new Error(detail);
      }

      // 请求成功，添加用户消息
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        style_id: null,
        created_at: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, userMsg] }));

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let newTitle: string | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  set({ streamingContent: fullContent });
                }
                if (data.reason) {
                  throw new Error("内容违规，请重新输入");
                }
                if (data.title) {
                  newTitle = data.title;
                }
              } catch (e) {
                if ((e as Error).message.includes("违规")) throw e;
              }
            }
          }
        }
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: fullContent,
        style_id: null,
        created_at: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        streamingContent: "",
        isStreaming: false,
        // Update conversation title if new title was generated
        conversations: newTitle
          ? s.conversations.map((c) => (c.id === convId ? { ...c, title: newTitle! } : c))
          : s.conversations,
      }));
    } catch (e) {
      set({ isStreaming: false, streamingContent: "" });
      throw e;
    }
  },

  setCurrentStyle: (identifier: string) => {
    const { currentConvId, currentStyle } = get();
    if (currentStyle === identifier) return;
    set({ currentStyle: identifier });
    localStorage.setItem("currentStyle", identifier);
    // 记录风格切换（异步，不阻塞UI）
    if (currentConvId) {
      api.post(`/chat/conversations/${currentConvId}/switch-style`, {
        style_identifier: identifier,
      }).catch(() => {});
    } else {
      api.post(`/chat/switch-style`, {
        style_identifier: identifier,
        from_style_identifier: currentStyle,
      }).catch(() => {});
    }
  },
}));

import { useAuthStore } from "@/stores/authStore";

