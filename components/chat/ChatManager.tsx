"use client";

import { useChat } from "./ChatContext";
import ChatPopup from "./ChatPopup";

export default function ChatManager() {
  const {
    openChats,
    token,
    currentUserId,
    onlineUsers,
    socket,
    closeChat,
  } = useChat();

  if (openChats.length === 0) {
    return null;
  }

  return (
    <div
      className="
        fixed
        bottom-0
        right-0
        left-0
        z-[60]
        flex
        items-end
        justify-end
        gap-3
        px-2
        sm:px-4
        pointer-events-none
        overflow-hidden
      "
    >
      <div
        className="
          flex
          items-end
          gap-3
          max-w-full
          overflow-x-auto
          scrollbar-none
          pointer-events-none
        "
      >
        {openChats.map((conversation) => (
          <div
            key={conversation._id}
            className="
              pointer-events-auto
              flex-shrink-0
              max-w-full
            "
          >
            <ChatPopup
              conversation={conversation}
              token={token}
              currentUserId={currentUserId}
              onlineUsers={onlineUsers}
              socket={socket}
              onClose={() =>
                closeChat(conversation._id)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
