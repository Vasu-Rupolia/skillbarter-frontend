"use client";

import { useEffect, useState, useRef } from "react";
import API from "@/lib/api";
import { io } from "socket.io-client";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Send,
  Mic,
  Square,
  ArrowLeft,
  Phone,
  Video,
} from "lucide-react";

type Conversation = {
  _id: string;
  user: {
    _id: string;
    name: string;
    image?: string;
  };
  lastMessage?: string;
};

type Friend = {
  _id: string;
  name: string;
  image?: string;
};

type Message = {
  _id?: string;
  text?: string;
  sender: string;
  conversationId?: string;

  type?: "text" | "voice";

  audio?: string;

  createdAt?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedChat, setSelectedChat] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const [showSidebar, setShowSidebar] = useState(true);

  const [isTyping, setIsTyping] = useState(false);

  const [recording, setRecording] = useState(false);

  const [uploadingVoice, setUploadingVoice] = useState(false);

  const socketRef = useRef<any>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const typingTimeout = useRef<any>(null);

  const mediaRecorderRef = useRef<any>(null);

  const audioChunksRef = useRef<Blob[]>([]);

  const pageRef = useRef(1);

  const hasMoreRef = useRef(true);

  const loadingMoreRef = useRef(false);

  const IMAGE_BASE_URL =
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

  const AUDIO_BASE_URL =
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

  // =========================================
  // LOAD USER
  // =========================================

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    setToken(storedToken);

    setCurrentUserId(user?._id || null);
  }, []);

  // =========================================
  // SOCKET
  // =========================================

  useEffect(() => {
    if (!currentUserId) return;

    // socketRef.current = io("http://85.121.120.156:5072");
    socketRef.current = io("https://api.skillbarter.codevocab.com");

    socketRef.current.emit("join", currentUserId);

    socketRef.current.on("user_online", (id: string) => {
      setOnlineUsers((prev) => [...new Set([...prev, id])]);
    });

    socketRef.current.on("user_offline", (id: string) => {
      setOnlineUsers((prev) =>
        prev.filter((u) => u !== id)
      );
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [currentUserId]);

  // =========================================
  // RECEIVE MESSAGE
  // =========================================

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on(
      "receive_message",
      (msg: Message) => {
        if (msg.conversationId === selectedChat?._id) {
          setMessages((prev) => [...prev, msg]);

          scrollToBottom();
        }

        setConversations((prev) =>
          prev.map((c) =>
            c._id === msg.conversationId
              ? {
                  ...c,
                  lastMessage:
                    msg.type === "voice"
                      ? "🎤 Voice message"
                      : msg.text,
                }
              : c
          )
        );
      }
    );

    return () => {
      socketRef.current.off("receive_message");
    };
  }, [selectedChat]);

  // =========================================
  // TYPING
  // =========================================

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("typing", () => {
      setIsTyping(true);
    });

    socketRef.current.on("stop_typing", () => {
      setIsTyping(false);
    });

    return () => {
      socketRef.current.off("typing");
      socketRef.current.off("stop_typing");
    };
  }, []);

  // =========================================
  // FETCH DATA
  // =========================================

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [convRes, friendRes] = await Promise.all([
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

        setConversations(convRes.data);

        setFriends(friendRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // =========================================
  // URL CHAT
  // =========================================

  useEffect(() => {
    const chatId = searchParams.get("c");

    if (!chatId || conversations.length === 0) return;

    const chat = conversations.find(
      (c) => c._id === chatId
    );

    if (chat && selectedChat?._id !== chatId) {
      openChat(chat, false);
    }
  }, [searchParams, conversations]);

  // =========================================
  // SCROLL
  // =========================================

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // =========================================
  // OPEN CHAT
  // =========================================

  const openChat = async (
    chat: Conversation,
    pushUrl = true
  ) => {
    setSelectedChat(chat);

    setShowSidebar(false);

    pageRef.current = 1;

    hasMoreRef.current = true;

    if (pushUrl) {
      router.push(`/chatnew?c=${chat._id}`);
    }

    try {
      const res = await API.get(
        `/chat/messages/${chat._id}?page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessages(res.data.messages || []);

      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // LOAD MORE
  // =========================================

  const loadMoreMessages = async () => {
    if (
      !selectedChat ||
      loadingMoreRef.current ||
      !hasMoreRef.current
    )
      return;

    loadingMoreRef.current = true;

    try {
      const nextPage = pageRef.current + 1;

      const res = await API.get(
        `/chat/messages/${selectedChat._id}?page=${nextPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const oldScrollHeight =
        messagesContainerRef.current?.scrollHeight || 0;

      if (res.data.messages.length === 0) {
        hasMoreRef.current = false;
      } else {
        setMessages((prev) => [
          ...res.data.messages,
          ...prev,
        ]);

        pageRef.current = nextPage;

        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop =
              messagesContainerRef.current.scrollHeight -
              oldScrollHeight;
          }
        }, 50);
      }
    } catch (err) {
      console.error(err);
    } finally {
      loadingMoreRef.current = false;
    }
  };

  // =========================================
  // SCROLL DETECT
  // =========================================

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    if (messagesContainerRef.current.scrollTop < 100) {
      loadMoreMessages();
    }
  };

  // =========================================
  // START CHAT
  // =========================================

  const startChat = async (friend: Friend) => {
    try {
      const res = await API.post(
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

      const existing = conversations.find(
        (c) => c._id === res.data._id
      );

      if (existing) {
        return openChat(existing);
      }

      const newChat: Conversation = {
        _id: res.data._id,
        user: friend,
      };

      setConversations((prev) => [
        newChat,
        ...prev,
      ]);

      openChat(newChat);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // SEND TEXT MESSAGE
  // =========================================

  const sendMessage = async () => {
    if (!input.trim() || !selectedChat) return;

    try {
      await API.post(
        "/chat/messages",
        {
          conversationId: selectedChat._id,
          text: input,
          type: "text",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setInput("");

      clearTimeout(typingTimeout.current);
      socketRef.current?.emit("stop_typing", {
        sender: currentUserId,
        receiver: selectedChat.user._id,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // VOICE RECORDING
  // =========================================

  const startRecording = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          setUploadingVoice(true);

          const audioBlob = new Blob(
            audioChunksRef.current,
            {
              type: "audio/webm",
            }
          );

          const formData = new FormData();

          formData.append(
            "conversationId",
            selectedChat!._id
          );

          formData.append("type", "voice");

          formData.append(
            "audio",
            audioBlob,
            "voice.webm"
          );

          await API.post(
            "/chat/messages",
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (err) {
          console.error(err);
        } finally {
          setUploadingVoice(false);
        }
      };

      mediaRecorder.start();

      setRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    setRecording(false);
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
  <div className="h-[calc(100vh-64px)] overflow-hidden bg-gray-100">

    <div className="h-full flex overflow-hidden">

      {/* SIDEBAR */}

      <aside
        className={`
          ${
            selectedChat && !showSidebar
              ? "hidden md:flex"
              : "flex"
          }
          w-full md:w-[340px]
          bg-white
          border-r border-gray-200
          flex-col
          overflow-hidden
          shrink-0
        `}
      >
        {/* HEADER */}

        <div className="h-16 shrink-0 border-b px-5 flex items-center justify-between">
          <h2 className="font-bold text-xl">
            Chats
          </h2>
        </div>

        {/* CONVERSATIONS */}

        <div className="flex-1 overflow-y-auto">

          {conversations.map((chat) => (
            <div
              key={chat._id}
              onClick={() => openChat(chat)}
              className={`
                mx-2 my-1
                rounded-xl
                cursor-pointer
                transition
                hover:bg-gray-100
                ${
                  selectedChat?._id === chat._id
                    ? "bg-blue-50"
                    : ""
                }
              `}
            >
              <div className="p-3 flex items-center gap-3">

                <div className="relative">

                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300">
                    {chat.user.image && (
                      <img
                        src={`${IMAGE_BASE_URL}${chat.user.image}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {onlineUsers.includes(chat.user._id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">

                  <p className="font-medium truncate">
                    {chat.user.name}
                  </p>

                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage ||
                      "Start conversation"}
                  </p>

                </div>
              </div>
            </div>
          ))}

          {/* FRIENDS */}

          <div className="mt-4 border-t p-3">

            <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase">
              Friends
            </h3>

            {friends.map((friend) => (
              <div
                key={friend._id}
                onClick={() => startChat(friend)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 cursor-pointer"
              >

                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300">
                  {friend.image && (
                    <img
                      src={`${IMAGE_BASE_URL}${friend.image}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <span className="truncate">
                  {friend.name}
                </span>

              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* CHAT AREA */}

      <main
        className={`
          flex-1
          bg-gray-50
          flex
          flex-col
          overflow-hidden
          ${
            !selectedChat && showSidebar
              ? "hidden md:flex"
              : "flex"
          }
        `}
      >

        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a conversation
          </div>
        ) : (
          <>
            {/* HEADER */}

            <div className="h-16 shrink-0 bg-white border-b px-4 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <button
                  onClick={() => {
                    setShowSidebar(true);
                    setSelectedChat(null);
                  }}
                  className="md:hidden"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="relative">

                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-300">
                    {selectedChat.user.image && (
                      <img
                        src={`${IMAGE_BASE_URL}${selectedChat.user.image}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {onlineUsers.includes(
                    selectedChat.user._id
                  ) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>

                <div>

                  <h2 className="font-semibold">
                    {selectedChat.user.name}
                  </h2>

                  <p className="text-xs text-gray-500">
                    {onlineUsers.includes(
                      selectedChat.user._id
                    )
                      ? "Online"
                      : "Offline"}
                  </p>

                </div>
              </div>

              <div className="flex gap-4 text-gray-600">
                <Phone size={20} />
                <Video size={20} />
              </div>

            </div>

            {/* MESSAGES */}

            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >

              {messages.map((msg, i) => (
                <div
                  key={msg._id || i}
                  className={`flex ${
                    msg.sender === currentUserId
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`
                      max-w-[80%]
                      px-4
                      py-3
                      rounded-3xl
                      shadow-sm
                      ${
                        msg.sender === currentUserId
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white border rounded-bl-md"
                      }
                    `}
                  >

                    {msg.type === "voice" ? (
                      <audio controls>
                        <source
                          src={`${AUDIO_BASE_URL}${msg.audio}`}
                        />
                      </audio>
                    ) : (
                      <p className="break-words text-sm">
                        {msg.text}
                      </p>
                    )}

                    <div
                      className={`
                        text-[10px]
                        mt-1
                        text-right
                        ${
                          msg.sender === currentUserId
                            ? "text-blue-100"
                            : "text-gray-400"
                        }
                      `}
                    >
                      {msg.createdAt
                        ? new Date(
                            msg.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>

                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="text-xs text-gray-500">
                  {selectedChat.user.name} is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}

            <div className="shrink-0 bg-white border-t p-3">

              <div className="flex gap-2">

                <input
                  value={input}
                  // onChange={(e) =>
                  //   setInput(e.target.value)
                  // }
                  onChange={(e) => {
                    setInput(e.target.value);

                      if (!socketRef.current || !selectedChat) return;

                      socketRef.current.emit("typing", {
                          sender: currentUserId,
                          receiver: selectedChat.user._id,
                      });

                      clearTimeout(typingTimeout.current);

                      typingTimeout.current = setTimeout(() => {
                          socketRef.current?.emit("stop_typing", {
                              sender: currentUserId,
                              receiver: selectedChat.user._id,
                          });
                      }, 1000);
                  }}
                  onBlur={() => {
                      if (!selectedChat) return;

                      socketRef.current?.emit("stop_typing", {
                          sender: currentUserId,
                          receiver: selectedChat.user._id,
                      });
                  }}
                  placeholder="Type a message..."
                  className="flex-1 h-12 px-4 rounded-full border outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    sendMessage()
                  }
                />

                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"
                  >
                    <Mic size={20} />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <Square size={18} />
                  </button>
                )}

                <button
                  onClick={sendMessage}
                  className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center"
                >
                  <Send size={18} />
                </button>

              </div>
            </div>
          </>
        )}
      </main>

    </div>
  </div>
); //

// return (
//   <div className="h-screen flex bg-gray-50 overflow-hidden">

//     {/* SIDEBAR */}
//     <div
//       className={`
//         fixed md:static
//         flex flex-col
//         z-10
//         top-0 left-0
//         h-full
//         w-full md:w-[340px]
//         bg-white border-r border-gray-100
//         transition-transform duration-300
//         ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
//       `}
//     >
//       <div className="p-4 border-b shrink-0">
//         <h1 className="font-bold text-2xl">Chats</h1>
//       </div>

//       <div className="flex-1 overflow-y-auto min-h-0">
//         {conversations.map((chat) => (
//           <div
//             key={chat._id}
//             onClick={() => openChat(chat)}
//             className="p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
//           >
//             <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300">
//               {chat.user.image && (
//                 <img
//                   src={`${IMAGE_BASE_URL}${chat.user.image}`}
//                   className="w-full h-full object-cover"
//                 />
//               )}
//             </div>

//             <div className="flex-1 overflow-hidden">
//               <p className="font-medium truncate">{chat.user.name}</p>
//               <p className="text-sm text-gray-500 truncate">
//                 {chat.lastMessage || "Start conversation"}
//               </p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>

//     {/* CHAT AREA */}
//     <div className="flex-1 flex flex-col h-screen overflow-hidden">

//       {/* HEADER (fixed height) */}
//       <div className="h-16 shrink-0 border-b flex items-center justify-between px-4 bg-white">

//         <div className="flex items-center gap-3">

//           <button
//             onClick={() => setShowSidebar(true)}
//             className="md:hidden"
//           >
//             <ArrowLeft size={20} />
//           </button>

//           <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300">
//             {selectedChat?.user?.image && (
//               <img
//                 src={`${IMAGE_BASE_URL}${selectedChat.user.image}`}
//                 className="w-full h-full object-cover"
//               />
//             )}
//           </div>

//           <div>
//             <h2 className="font-semibold">
//               {selectedChat?.user?.name}
//             </h2>
//             <p className="text-xs text-gray-500">
              
//               {selectedChat?.user?._id && onlineUsers.includes(selectedChat?.user?._id)
//                 ? "Online"
//                 : "Offline"}
//             </p>
//           </div>

//         </div>
//       </div>

//       {/* MESSAGES (ONLY SCROLL AREA) */}
//       <div
//         ref={messagesContainerRef}
//         onScroll={handleScroll}
//         className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 bg-gray-50"
//       >
//         {messages.map((msg, i) => (
//           <div
//             key={msg._id || i}
//             className={`flex ${
//               msg.sender === currentUserId ? "justify-end" : "justify-start"
//             }`}
//           >
//             <div
//               className={`max-w-[75%] px-4 py-2 rounded-2xl ${
//                 msg.sender === currentUserId
//                   ? "bg-red-500 text-white"
//                   : "bg-white border"
//               }`}
//             >
//               {msg.type === "voice" ? (
//                 <audio controls>
//                   <source src={`${AUDIO_BASE_URL}${msg.audio}`} />
//                 </audio>
//               ) : (
//                 <p className="text-sm break-words">{msg.text}</p>
//               )}
//             </div>
//           </div>
//         ))}

//         <div ref={messagesEndRef} />
//       </div>

//       {/* INPUT (ALWAYS VISIBLE) */}
//       <div className="shrink-0 border-t bg-white p-3">

//         <div className="flex items-center gap-2">

//           <input
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             className="flex-1 border rounded-full px-4 py-3 text-sm outline-none"
//             placeholder="Type a message..."
//             onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//           />

//           <button
//             onClick={sendMessage}
//             className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center"
//           >
//             <Send size={18} />
//           </button>

//         </div>

//       </div>

//     </div>

//   </div>
// );
}