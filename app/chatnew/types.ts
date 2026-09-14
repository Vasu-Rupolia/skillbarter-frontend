export interface Friend {
    _id: string;
    name: string;
    image?: string;
}

export interface Conversation {
    _id: string;
    user: Friend;
    lastMessage?: string;
}

export interface Message {
    _id?: string;

    sender: string;

    conversationId?: string;

    type?: "text" | "voice";

    text?: string;

    audio?: string;

    createdAt?: string;
}