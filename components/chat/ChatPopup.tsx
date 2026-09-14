"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Send,
  Mic,
  Square,
  Minus,
  X,
} from "lucide-react";

import API from "@/lib/api";

import {
  Conversation,
  Message,
} from "./ChatContext";

import { Socket } from "socket.io-client";

type Props = {
  conversation: Conversation;
  token: string | null;
  currentUserId: string | null;
  onlineUsers: string[];
  socket: Socket | null;
  onClose: () => void;
};

export default function ChatPopup({
  conversation,
  token,
  currentUserId,
  onlineUsers,
  socket,
  onClose,
}: Props) {
  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [minimized, setMinimized] =
    useState(false);

  const [isTyping, setIsTyping] =
    useState(false);

  const [recording, setRecording] =
    useState(false);

  const [uploadingVoice, setUploadingVoice] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  const typingTimeout =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const IMAGE_BASE_URL =
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

  const AUDIO_BASE_URL =
    process.env.NEXT_PUBLIC_IMAGE_BASE_URL;

  /*
  |--------------------------------------------------------------------------
  | LOAD MESSAGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!token) return;

    const loadMessages = async () => {
      try {
        const response = await API.get(
          `/chat/messages/${conversation._id}?page=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setMessages(
          response.data.messages || []
        );
      } catch (error) {
        console.error(error);
      }
    };

    loadMessages();
  }, [conversation._id, token]);

  /*
  |--------------------------------------------------------------------------
  | RECEIVE MESSAGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!socket) return;

    const handler = (message: Message) => {
      if (
        message.conversationId !==
        conversation._id
      ) {
        return;
      }

      setMessages((previous) => [
        ...previous,
        message,
      ]);
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
  }, [
    socket,
    conversation._id,
  ]);

  /*
  |--------------------------------------------------------------------------
  | TYPING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!socket) return;

    const typingHandler = (data: any) => {
      if (
        data?.sender ===
        conversation.user._id
      ) {
        setIsTyping(true);
      }
    };

    const stopTypingHandler = (
      data: any
    ) => {
      if (
        !data ||
        data?.sender ===
          conversation.user._id
      ) {
        setIsTyping(false);
      }
    };

    socket.on(
      "typing",
      typingHandler
    );

    socket.on(
      "stop_typing",
      stopTypingHandler
    );

    return () => {
      socket.off(
        "typing",
        typingHandler
      );

      socket.off(
        "stop_typing",
        stopTypingHandler
      );
    };
  }, [
    socket,
    conversation.user._id,
  ]);

  /*
  |--------------------------------------------------------------------------
  | CLEANUP TYPING TIMER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(
          typingTimeout.current
        );
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SCROLL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (minimized) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    messages,
    minimized,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  const sendMessage = async () => {
    if (
      !input.trim() ||
      !token
    ) {
      return;
    }

    try {
      await API.post(
        "/chat/messages",
        {
          conversationId:
            conversation._id,
          text: input.trim(),
          type: "text",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setInput("");

      socket?.emit(
        "stop_typing",
        {
          sender: currentUserId,
          receiver:
            conversation.user._id,
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RECORDING
  |--------------------------------------------------------------------------
  */

  const startRecording = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      const recorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        recorder;

      audioChunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = async () => {
        try {
          setUploadingVoice(true);

          const blob = new Blob(
            audioChunksRef.current,
            {
              type: "audio/webm",
            }
          );

          const formData =
            new FormData();

          formData.append(
            "conversationId",
            conversation._id
          );

          formData.append(
            "type",
            "voice"
          );

          formData.append(
            "audio",
            blob,
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
        } catch (error) {
          console.error(error);
        } finally {
          setUploadingVoice(false);
        }

        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      };

      recorder.start();

      setRecording(true);
    } catch (error) {
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  };

  /*
  |--------------------------------------------------------------------------
  | INPUT
  |--------------------------------------------------------------------------
  */

  const handleInput = (
    value: string
  ) => {
    setInput(value);

    if (!socket) return;

    socket.emit("typing", {
      sender: currentUserId,
      receiver:
        conversation.user._id,
    });

    if (typingTimeout.current) {
      clearTimeout(
        typingTimeout.current
      );
    }

    typingTimeout.current =
      setTimeout(() => {
        socket.emit(
          "stop_typing",
          {
            sender: currentUserId,
            receiver:
              conversation.user._id,
          }
        );
      }, 1000);
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className="
        w-[340px]
        max-w-[calc(100vw-16px)]
        sm:max-w-[calc(100vw-32px)]

        bg-white
        rounded-t-xl
        shadow-2xl
        border
        border-gray-200

        overflow-hidden

        flex
        flex-col

        transition-all
      "
    >
      {/* HEADER */}

      <div
        className="
          h-12
          min-h-12

          bg-white
          border-b

          flex
          items-center
          justify-between

          px-3
          sm:px-3

          gap-2
        "
      >
        {/* USER */}

        <div
          className="
            flex
            items-center
            gap-2
            min-w-0
            flex-1
          "
        >
          <div className="relative flex-shrink-0">
            <div
              className="
                w-8
                h-8
                rounded-full
                overflow-hidden
                bg-gray-200
              "
            >
              {conversation.user.image ? (
                <img
                  src={`${IMAGE_BASE_URL}${conversation.user.image}`}
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                  alt=""
                />
              ) : (
                <div
                  className="
                    w-full
                    h-full
                    flex
                    items-center
                    justify-center
                    text-xs
                    font-semibold
                  "
                >
                  {conversation.user.name?.charAt(
                    0
                  )}
                </div>
              )}
            </div>

            {onlineUsers.includes(
              conversation.user._id
            ) && (
              <span
                className="
                  absolute
                  bottom-0
                  right-0

                  w-2.5
                  h-2.5

                  bg-green-500
                  rounded-full
                  border
                  border-white
                "
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="
                font-semibold
                text-sm
                truncate
              "
            >
              {conversation.user.name}
            </p>

            <p
              className="
                text-[10px]
                text-gray-500
                truncate
              "
            >
              {onlineUsers.includes(
                conversation.user._id
              )
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        {/* ACTIONS */}

        <div
          className="
            flex
            items-center
            gap-0.5
            flex-shrink-0
          "
        >
          <button
            type="button"
            onClick={() =>
              setMinimized(
                (previous) =>
                  !previous
              )
            }
            className="
              w-7
              h-7
              rounded-full
              hover:bg-gray-100
              active:bg-gray-200
              flex
              items-center
              justify-center
            "
          >
            <Minus size={16} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="
              w-7
              h-7
              rounded-full
              hover:bg-gray-100
              active:bg-gray-200
              flex
              items-center
              justify-center
            "
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* MESSAGES */}

          <div
            className="
              h-[min(360px,calc(100vh-170px))]

              sm:h-[360px]

              overflow-y-auto

              p-2.5
              sm:p-3

              space-y-2

              bg-gray-50

              overscroll-contain
            "
          >
            {messages.map(
              (message, index) => {
                const mine =
                  message.sender ===
                  currentUserId;

                return (
                  <div
                    key={
                      message._id ||
                      index
                    }
                    className={`flex ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`
                        max-w-[82%]
                        sm:max-w-[78%]

                        px-3
                        py-2

                        rounded-2xl

                        break-words

                        ${
                          mine
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-white border rounded-bl-md"
                        }
                      `}
                    >
                      {message.type ===
                      "voice" ? (
                        <audio
                          controls
                          className="
                            max-w-full
                            w-[220px]
                            sm:w-[240px]
                          "
                        >
                          <source
                            src={`${AUDIO_BASE_URL}${message.audio}`}
                          />
                        </audio>
                      ) : (
                        <p
                          className="
                            text-sm
                            break-words
                            whitespace-pre-wrap
                          "
                        >
                          {message.text}
                        </p>
                      )}

                      <div
                        className={`
                          text-[9px]
                          text-right
                          mt-1

                          ${
                            mine
                              ? "text-blue-100"
                              : "text-gray-400"
                          }
                        `}
                      >
                        {message.createdAt
                          ? new Date(
                              message.createdAt
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              }
            )}

            {isTyping && (
              <div
                className="
                  text-xs
                  text-gray-500
                  px-1
                "
              >
                {
                  conversation.user
                    .name
                }{" "}
                is typing...
              </div>
            )}

            <div
              ref={messagesEndRef}
            />
          </div>

          {/* INPUT */}

          <div
            className="
              border-t
              p-2

              bg-white

              flex-shrink-0
            "
          >
            <div
              className="
                flex
                items-center
                gap-1.5
              "
            >
              <input
                value={input}
                onChange={(event) =>
                  handleInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="
                  flex-1
                  min-w-0

                  h-10

                  px-3

                  rounded-full

                  border

                  text-sm

                  outline-none

                  focus:ring-2
                  focus:ring-blue-500
                "
              />

              {!recording ? (
                <button
                  type="button"
                  onClick={
                    startRecording
                  }
                  disabled={
                    uploadingVoice
                  }
                  className="
                    w-10
                    h-10
                    min-w-10

                    rounded-full

                    bg-gray-100

                    flex
                    items-center
                    justify-center

                    flex-shrink-0

                    hover:bg-gray-200
                    active:bg-gray-300

                    disabled:opacity-50
                  "
                >
                  <Mic size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    stopRecording
                  }
                  className="
                    w-10
                    h-10
                    min-w-10

                    rounded-full

                    bg-red-500
                    text-white

                    flex
                    items-center
                    justify-center

                    flex-shrink-0
                  "
                >
                  <Square size={15} />
                </button>
              )}

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  !input.trim()
                }
                className="
                  w-10
                  h-10
                  min-w-10

                  rounded-full

                  bg-blue-600
                  text-white

                  flex
                  items-center
                  justify-center

                  flex-shrink-0

                  hover:bg-blue-700
                  active:bg-blue-800

                  disabled:opacity-50
                "
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}