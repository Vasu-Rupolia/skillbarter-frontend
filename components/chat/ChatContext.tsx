"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import API from "@/lib/api";
import { io, Socket } from "socket.io-client";

export type Conversation = {
  _id: string;
  user: {
    _id: string;
    name: string;
    image?: string;
  };
  lastMessage?: string;
};

export type Friend = {
  _id: string;
  name: string;
  image?: string;
};

export type Message = {
  _id?: string;
  text?: string;
  sender: string;
  conversationId?: string;
  type?: "text" | "voice";
  audio?: string;
  createdAt?: string;
};

type ChatContextType = {
  conversations: Conversation[];
  friends: Friend[];
  openChats: Conversation[];
  onlineUsers: string[];
  token: string | null;
  currentUserId: string | null;

  openChat: (
    conversation: Conversation
  ) => void;

  startChat: (
    friend: Friend
  ) => Promise<void>;

  closeChat: (
    conversationId: string
  ) => void;

  socket: Socket | null;
};

const ChatContext =
  createContext<ChatContextType | null>(
    null
  );

export function ChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] =
    useState<string | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [friends, setFriends] =
    useState<Friend[]>([]);

  const [openChats, setOpenChats] =
    useState<Conversation[]>([]);

  const [onlineUsers, setOnlineUsers] =
    useState<string[]>([]);

  const socketRef =
    useRef<Socket | null>(null);

  /*
  |--------------------------------------------------------------------------
  | USER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const storedToken =
      localStorage.getItem("token");

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    setToken(storedToken);
    setCurrentUserId(user?._id || null);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const [conversationResponse, friendResponse] =
          await Promise.all([
            API.get("/chat/conversations", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),

            API.get("/users/friends", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
          ]);

        setConversations(
          conversationResponse.data || []
        );

        setFriends(
          friendResponse.data?.data || []
        );
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | SOCKET
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!currentUserId) return;

    const socket = io(
      "https://api.skillbarter.codevocab.com"
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(
        "join",
        currentUserId
      );
    });

    socket.on(
      "user_online",
      (userId: string) => {
        setOnlineUsers((previous) =>
          Array.from(
            new Set([
              ...previous,
              userId,
            ])
          )
        );
      }
    );

    socket.on(
      "user_offline",
      (userId: string) => {
        setOnlineUsers((previous) =>
          previous.filter(
            (id) => id !== userId
          )
        );
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId]);

  /*
  |--------------------------------------------------------------------------
  | OPEN CHAT
  |--------------------------------------------------------------------------
  */

  const openChat = (
    conversation: Conversation
  ) => {
    setOpenChats((previous) => {
      if (
        previous.some(
          (chat) =>
            chat._id ===
            conversation._id
        )
      ) {
        return previous;
      }

      return [
        ...previous,
        conversation,
      ].slice(-3);
    });
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE
  |--------------------------------------------------------------------------
  */

  const closeChat = (
    conversationId: string
  ) => {
    setOpenChats((previous) =>
      previous.filter(
        (chat) =>
          chat._id !== conversationId
      )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | START CHAT
  |--------------------------------------------------------------------------
  */

  const startChat = async (
    friend: Friend
  ) => {
    if (!token) return;

    try {
      const response =
        await API.post(
          "/chat/conversations",
          {
            receiverId: friend._id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const existing =
        conversations.find(
          (chat) =>
            chat._id ===
            response.data._id
        );

      if (existing) {
        openChat(existing);
        return;
      }

      const newChat: Conversation = {
        _id: response.data._id,
        user: friend,
      };

      setConversations((previous) => [
        newChat,
        ...previous,
      ]);

      openChat(newChat);
    } catch (error) {
      console.error(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RECEIVE MESSAGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket) return;

    const handler = (
      message: Message
    ) => {
      if (!message.conversationId)
        return;

      setConversations((previous) =>
        previous.map((chat) =>
          chat._id ===
          message.conversationId
            ? {
                ...chat,
                lastMessage:
                  message.type ===
                  "voice"
                    ? "🎤 Voice message"
                    : message.text,
              }
            : chat
        )
      );
    };

    socket.on(
      "receive_message",
      handler
    );

    return () => {
      socket.off(
        "receive_message",
        handler
      );
    };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        friends,
        openChats,
        onlineUsers,
        token,
        currentUserId,
        openChat,
        startChat,
        closeChat,
        socket:
          socketRef.current,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context =
    useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChat must be used inside ChatProvider"
    );
  }

  return context;
}