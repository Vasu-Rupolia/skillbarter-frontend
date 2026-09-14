import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "../types";

const SOCKET_URL =
    "https://api.skillbarter.codevocab.com";

interface Props {

    currentUserId: string | null;

    selectedConversationId?: string;

    onMessage?: (msg: Message) => void;

    onTyping?: () => void;

    onStopTyping?: () => void;
}

export default function useSocket({

    currentUserId,

    onMessage,

    onTyping,

    onStopTyping

}: Props) {

    const socket = useRef<Socket | null>(null);

    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    useEffect(() => {

        if (!currentUserId) return;

        socket.current = io(SOCKET_URL);

        socket.current.emit("join", currentUserId);

        socket.current.on(
            "online_users_list",
            (users: string[]) => {
                setOnlineUsers(users);
            }
        );

        socket.current.on(
            "user_online",
            (userId: string) => {

                setOnlineUsers((prev) => {

                    if (prev.includes(userId))
                        return prev;

                    return [...prev, userId];

                });

            }
        );

        socket.current.on(
            "user_offline",
            (userId: string) => {

                setOnlineUsers((prev) =>
                    prev.filter(
                        (id) => id !== userId
                    )
                );

            }
        );

        socket.current.on(
            "receive_message",
            (msg: Message) => {

                onMessage?.(msg);

            }
        );

        socket.current.on(
            "typing",
            () => {

                onTyping?.();

            }
        );

        socket.current.on(
            "stop_typing",
            () => {

                onStopTyping?.();

            }
        );

        return () => {

            socket.current?.disconnect();

        };

    }, [currentUserId]);

    return {

        socket: socket.current,

        onlineUsers

    };

}