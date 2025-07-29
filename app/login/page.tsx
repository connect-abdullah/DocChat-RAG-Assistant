"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/server/server.actions";


const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      alert("Please enter both email and password.");
      return;
    }

    try {
      const response = await login(trimmedEmail, trimmedPassword);

      // login returns data or error.status (number)
      if (response && typeof response !== "number" && response.user) {
        alert("Successfully Logged In");
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else if (response === 400 || response === 401) {
        alert("Invalid email or password.");
      } else {
        alert("Error Logging In");
      }
    } catch (error) {
      alert("An error occurred during login.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-gray-800 rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-semibold text-center text-blue-400 mb-6">
        Login
      </h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="text-gray-200 font-medium">
          Email:
          <input
            type="email"
            className="block w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="text-gray-200 font-medium relative">
          Password:
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="block w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:border-blue-500 pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm focus:outline-none"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <button
          type="submit"
          className="py-3 bg-blue-600 text-white border-none rounded-md font-semibold text-base cursor-pointer transition-colors hover:bg-blue-700"
        >
          Login
        </button>
        <div className="mt-6 text-center text-gray-300">
        Already have an account?{" "}
        <button
          className="text-blue-400 hover:underline"
          onClick={() => router.push("/sign-up")}
          type="button"
        >
          SignUp
        </button>
      </div>
      </form>
    </div>
  );
};

export default LoginPage;
