"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import { useEffect, useState } from "react";

import { ChatProvider } from "@/components/chat/ChatContext";
import ChatManager from "@/components/chat/ChatManager";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideLayoutRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
  ];

  const hideLayout =
    hideLayoutRoutes.includes(pathname);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [sidebarOpen]);

  if (hideLayout) {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      <Header
        onMenuClick={() =>
          setSidebarOpen(true)
        }
      />

      <div className="pt-16 flex">
        <main className="flex-1">
          {children}
        </main>
      </div>

      <ChatManager />
    </ChatProvider>
  );
}