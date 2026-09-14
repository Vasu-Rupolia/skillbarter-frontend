import { useRef, useState } from "react";
import { Socket } from "socket.io-client";

interface Props {

    socket: Socket | null;

    currentUserId: string | null;

    receiverId?: string;

}

export default function useTyping({

    socket,

    currentUserId,

    receiverId

}: Props) {

    const [isTyping, setIsTyping] =
        useState(false);

    const timeoutRef =
        useRef<NodeJS.Timeout | null>(null);

    const handleTyping = () => {

        if (!socket || !receiverId) return;

        socket.emit("typing", {

            sender: currentUserId,

            receiver: receiverId

        });

        if (timeoutRef.current)
            clearTimeout(timeoutRef.current);

        timeoutRef.current =
            setTimeout(() => {

                socket.emit(
                    "stop_typing",
                    {

                        sender: currentUserId,

                        receiver: receiverId

                    }
                );

            }, 1000);

    };

    const stopTyping = () => {

        if (!socket || !receiverId) return;

        socket.emit("stop_typing", {

            sender: currentUserId,

            receiver: receiverId

        });

    };

    return {

        isTyping,

        setIsTyping,

        handleTyping,

        stopTyping

    };

}