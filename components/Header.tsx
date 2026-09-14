"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import API from "@/lib/api";
import Link from "next/link";
import { Users, User, Settings, LogOut, Handshake, Check, X, MessageCircle } from "lucide-react";
import { PanelLeft } from "lucide-react";
import { io } from "socket.io-client";
import { useChat } from "@/components/chat/ChatContext";

type UserType = {
  name: string;
  email?: string;
  _id?: string;
  image: string;
};

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<any>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    friends,
    onlineUsers,
    openChat,
    startChat,
  } = useChat();

  const [showMessages, setShowMessages] =
    useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // MENU close
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }

      // FRIEND REQUEST close
      if (requestRef.current && !requestRef.current.contains(target)) {
        setShowRequests(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // SOCKET INIT + LISTENER
  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_BASE_URL || "https://api.skillbarter.codevocab.com"
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      // const userId = localStorage.getItem("userId");

      // const userData = localStorage.getItem("user");

      // let userId = null;

      // if (userData) {
      //   userId = JSON.parse(userData)._id;
      // }

      const userId = localStorage.getItem("userId");

      console.log("Socket connected:", socket.id);

      if (userId) {
        socket.emit("join", userId);
        console.log("Joined room:", userId);
      }
    });

    socket.on("friend_request_received", (data: any) => {
      console.log("🔥 New request received:", data);

      setRequestCount((prev) => prev + 1);
      setFriendRequests((prev) => [data, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // USER FETCH
  useEffect(() => {
    const token = localStorage.getItem("token");

    const userData = async () => {
      try {
        const res = await API.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(res.data);
      } catch (error) {
        console.error(error);
      }
    };

    userData();
  }, []);

  // REQUEST COUNT
  useEffect(() => {
    const fetchRequestCount = async () => {
      try {
        const res = await API.get("/users/friend-requests", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setRequestCount(res.data.data.length);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRequestCount();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  // SEARCH
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await API.get(`/users/search?q=${query}`);
        setResults(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [query]);

  const toggleRequests = () => {
    setShowRequests((prev) => !prev);
  };

  // FETCH REQUESTS
  useEffect(() => {
    if (!showRequests) return;

    const fetchRequests = async () => {
      try {
        setLoadingRequests(true);

        const res = await API.get("/users/friend-requests", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setFriendRequests(res.data.data);
        setRequestCount(0);
      } catch (err) {
        console.error(err);
      }
      finally{
        setLoadingRequests(false);
      }
    };

    fetchRequests();
  }, [showRequests]);

  const acceptRequest = async (requestId: string) => {
    try {
      await API.put(
        "/users/friend-request",
        { requestId, action: "accept" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setFriendRequests((prev) =>
        prev.filter((r) => r._id !== requestId)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await API.put(
        "/users/friend-request",
        { requestId, action: "reject" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setFriendRequests((prev) =>
        prev.filter((r) => r._id !== requestId)
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 z-50 bg-white shadow px-6 py-3 flex items-center justify-between">
      
      <button onClick={onMenuClick} className="md:hidden text-gray-800">
        <PanelLeft size={24} />
      </button>

      <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
        <Link href="/" className="hover:text-red-600 transition">
          Skills Barter
        </Link>
      </h1>

      {/* SEARCH SAME */}
      <div className="relative w-full max-w-md mx-6">
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-400 text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        {query && (
          <div className="absolute top-12 left-0 w-full bg-white border shadow rounded-xl z-50">
            {loading && <p className="p-3 text-sm text-gray-600">Searching...</p>}
            {!loading && results.length === 0 && (
              <p className="p-3 text-sm text-gray-600">No users</p>
            )}

            {results.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => router.push(`/profile/${u._id}`)}
              >
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {u.image ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${u.image}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{u.name?.charAt(0)}</span>
                  )}
                </div>

                <span className="text-sm text-gray-600">{u.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ RIGHT SECTION — SAME DESIGN */}
      <div className="flex items-center gap-4 relative text-gray-600 hover:cursor-pointer">
        
        {/* MESSAGES */}

        <div className="relative">
          <button
            onClick={() =>
              setShowMessages(
                (previous) => !previous
              )
            }
            className="
              w-9
              h-9
              rounded-full
              hover:bg-gray-100
              flex
              items-center
              justify-center
              relative
            "
          >
            <MessageCircle size={19} />

            {conversations.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </button>

          {showMessages && (
            <div
              className="
                absolute
                right-0
                top-11
                w-[340px]
                bg-white
                border
                rounded-2xl
                shadow-2xl
                overflow-hidden
                z-[100]
              "
            >
              <div className="px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">
                  Messages
                </h3>

                <button
                  onClick={() =>
                    setShowMessages(false)
                  }
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto">

                {/* EXISTING CONVERSATIONS */}

                {conversations.length > 0 && (
                  <>
                    {conversations.map(
                      (conversation) => (
                        <button
                          key={
                            conversation._id
                          }
                          onClick={() => {
                            openChat(
                              conversation
                            );

                            setShowMessages(
                              false
                            );
                          }}
                          className="
                            w-full
                            flex
                            items-center
                            gap-3
                            px-4
                            py-3
                            hover:bg-gray-50
                            text-left
                          "
                        >
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200">
                              {conversation.user
                                .image ? (
                                <img
                                  src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${conversation.user.image}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-semibold">
                                  {conversation.user.name?.charAt(
                                    0
                                  )}
                                </div>
                              )}
                            </div>

                            {onlineUsers.includes(
                              conversation.user._id
                            ) && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {
                                conversation
                                  .user.name
                              }
                            </p>

                            <p className="text-sm text-gray-500 truncate">
                              {conversation.lastMessage ||
                                "Start conversation"}
                            </p>
                          </div>
                        </button>
                      )
                    )}
                  </>
                )}

                {/* FRIENDS */}

                {friends.length > 0 && (
                  <div className="border-t">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                      Friends
                    </div>

                    {friends.map((friend) => (
                      <button
                        key={friend._id}
                        onClick={() => {
                          startChat(friend);

                          setShowMessages(
                            false
                          );
                        }}
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-4
                          py-3
                          hover:bg-gray-50
                          text-left
                        "
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                          {friend.image ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${friend.image}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {friend.name?.charAt(
                                0
                              )}
                            </div>
                          )}
                        </div>

                        <span className="text-sm font-medium">
                          {friend.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {conversations.length === 0 &&
                  friends.length === 0 && (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No conversations yet.
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* FRIEND REQUEST */}
        <div ref={requestRef} className="relative">
          <div onClick={toggleRequests}>
            <Handshake size={18} />
          </div>

          {requestCount > 0 && !showRequests && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {requestCount}
            </span>
          )}

          {showRequests && (
            <div className="absolute right-0 mt-3 w-72 bg-white border shadow rounded-xl z-50 max-h-80 overflow-y-auto">
              <div className="p-3 border-b font-semibold">
                Friend Requests
              </div>

              {loadingRequests ? (
                <p className="p-3 text-sm">Loading...</p>
              ):friendRequests.length === 0 ? (
                <p className="p-3 text-sm">No requests</p>
              ) : (
                friendRequests.map((req: any) => (
                  <div key={req._id} className="flex justify-between items-center px-4 py-2 hover:bg-gray-100">
  
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                        {req.sender?.image ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${req.sender.image}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs">
                            {req.sender?.name?.charAt(0)}
                          </span>
                        )}
                      </div>

                      <span className="text-sm">{req.sender?.name}</span>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(req._id)}>
                        <Check size={16} />
                      </button>
                      <button onClick={() => rejectRequest(req._id)}>
                        <X size={16} />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div
          onClick={() => router.push(`/profile/${user?._id}`)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user?.image ? (
              <img
                src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${user.image}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs">{user?.name?.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* MENU */}
        <div ref={menuRef} className="relative">
          <button className="hover:cursor-pointer" onClick={() => setOpen(!open)}>
            {open ? "✕" : "☰"}
          </button>

          {open && (
            <div className="absolute right-0 top-12 bg-white border shadow rounded-xl w-48 py-2 z-50">
              <button onClick={() => {setOpen(false); router.push(`/profile/${user?._id}`)}} className="px-4 py-2 w-full text-left hover:cursor-pointer">
                Profile
              </button>
              <button onClick={() => {setOpen(false); router.push("/settings")}} className="px-4 py-2 w-full text-left hover:cursor-pointer">
                Settings
              </button>
              <button onClick={() => {setOpen(false); router.push("/friends")}} className="px-4 py-2 w-full text-left hover:cursor-pointer">
                Friends
              </button>
              <button onClick={() => {setOpen(false); router.push("/chatnew")}} className="px-4 py-2 w-full text-left hover:cursor-pointer">
                Chat
              </button>
              <button onClick={logout} className="px-4 py-2 w-full text-left hover:cursor-pointer">
                Logout
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}