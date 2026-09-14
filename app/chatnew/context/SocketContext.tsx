"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";

import { io, Socket } from "socket.io-client";

interface SocketContextType {
    socket: Socket | null;
    onlineUsers: string[];
}

const SocketContext =
    createContext<SocketContextType>({
        socket: null,
        onlineUsers: []
    });

export const SocketProvider = ({
    currentUserId,
    children
}: {
    currentUserId: string | null;
    children: React.ReactNode;
}) => {

    const socketRef = useRef<Socket | null>(null);

    const [onlineUsers, setOnlineUsers] =
        useState<string[]>([]);

    useEffect(() => {

        if (!currentUserId) return;

        socketRef.current = io(
            "https://api.skillbarter.codevocab.com"
        );

        socketRef.current.emit(
            "join",
            currentUserId
        );

        socketRef.current.on(
            "online_users_list",
            (users: string[]) => {
                setOnlineUsers(users);
            }
        );

        socketRef.current.on(
            "user_online",
            (userId: string) => {

                setOnlineUsers(prev => {

                    if (prev.includes(userId))
                        return prev;

                    return [...prev, userId];

                });

            }
        );

        socketRef.current.on(
            "user_offline",
            (userId: string) => {

                setOnlineUsers(prev =>
                    prev.filter(
                        id => id !== userId
                    )
                );

            }
        );

        return () => {

            socketRef.current?.disconnect();

        };

    }, [currentUserId]);

    return (

        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                onlineUsers
            }}
        >
            {children}
        </SocketContext.Provider>

    );

};

export const useSocket = () =>
    useContext(SocketContext);