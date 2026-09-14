
"use client";

import { useState } from "react";
import API from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const router = useRouter();

  const handleLogin = async (e?: any) => {
    e?.preventDefault();

    const res = await API.post("/auth/login", { email, password });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    localStorage.setItem("userId", JSON.stringify(res.data.user._id));

    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-red-50 via-white to-red-100">
      
      {/* Left Section */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-20 py-12">
        <div className="max-w-xl">
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
            Welcome to
            <span className="block text-red-600">
              Skill Barter
            </span>
          </h1>

          <p className="mt-6 text-lg text-gray-600">
            Connect with talented people, exchange skills,
            learn something new, and grow together.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-500">100+</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-500">50+</div>
              <div className="text-sm text-gray-600">Skills Listed</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-red-500">24/7</div>
              <div className="text-sm text-gray-600">Community</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Sign In
            </h2>

            <p className="text-gray-500 mt-2">
              Login to continue
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full px-4 py-3
                border border-gray-300
                rounded-xl
                text-gray-800
                placeholder-gray-400
                focus:outline-none
                focus:ring-2
                focus:ring-red-500
              "
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="
                w-full px-4 py-3
                border border-gray-300
                rounded-xl
                text-gray-800
                placeholder-gray-400
                focus:outline-none
                focus:ring-2
                focus:ring-red-500
              "
            />
          </div>

          <button
            type="submit"
            className="
              mt-6
              w-full
              py-3
              rounded-xl
              bg-red-600
              text-white
              font-semibold
              transition
              hover:bg-red-700
              cursor-pointer
            "
          >
            Sign In
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
          New User?

          <span
            onClick={() => router.push("/signup")}
            className="ml-1 text-red-600 font-medium cursor-pointer hover:underline"
          >
            Create an account
          </span>
        </p>

          <p className="text-center text-sm text-gray-500 mt-6">
            Secure login powered by Skill Barter
          </p>
        </form>
      </div>
    </div>
  );
}