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

  return (
    <div
      className="
        fixed
        bottom-0
        right-4
        z-[60]
        flex
        items-end
        gap-3
        pointer-events-none
      "
    >
      {openChats.map((conversation) => (
        <div
          key={conversation._id}
          className="pointer-events-auto"
        >
          <ChatPopup
            conversation={conversation}
            token={token}
            currentUserId={
              currentUserId
            }
            onlineUsers={onlineUsers}
            socket={socket}
            onClose={() =>
              closeChat(
                conversation._id
              )
            }
          />
        </div>
      ))}
    </div>
  );
}