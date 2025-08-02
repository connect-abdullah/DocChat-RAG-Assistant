"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/server/server.actions";
import Galaxy from '@/components/galaxy';
import toast, { Toaster } from 'react-hot-toast';

const SignUpPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      const response = await signUp(trimmedName, trimmedEmail, trimmedPassword);

      if (response && typeof response !== "number" && response.user) {
        toast.success("User Successfully Created");
        setTimeout(() => {
          router.push("/login");
        }, 1000);
      } else if (response === 422) {
        toast.error("User already exists !!");
      } else {
        toast.error("Error Creating User !!");
      }
    } catch (error) {
      toast.error("An error occurred during sign up.");
      console.error(error);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Galaxy background */}
      <div className="absolute inset-0 z-0">
        <Galaxy 
          mouseRepulsion={true}
          mouseInteraction={true}
          density={2.2}
          glowIntensity={0.4}
          twinkleIntensity={0.6}
          rotationSpeed={0}
          repulsionStrength={0.4}
          starSpeed={1.1}
          speed={0.6}
        />
        <div className="absolute inset-0 bg-slate-900/30 pointer-events-none z-10" />
      </div>
      {/* Sign Up form container */}
      <div className="relative z-10 max-w-md w-full mx-auto bg-slate-800/20 backdrop-blur-xl rounded-xl shadow-2xl p-8 mt-10 border border-slate-600/30">
        <h2 className="text-2xl font-semibold text-center text-slate-100 mb-6">
          Sign Up
        </h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="text-slate-100 font-medium">
            Name:
            <input
              type="text"
              className="block w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 placeholder-slate-400 backdrop-blur-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="text-slate-100 font-medium">
            Email:
            <input
              type="email"
              className="block w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 placeholder-slate-400 backdrop-blur-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="text-slate-100 font-medium relative">
            Password:
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="block w-full mt-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 pr-12 placeholder-slate-400 backdrop-blur-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm focus:outline-none transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <button
            type="submit"
            className="py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-none rounded-md font-semibold text-base cursor-pointer transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 shadow-lg hover:shadow-emerald-500/25"
          >
            Sign Up
          </button>
          <div className="mt-6 text-center text-slate-300">
            Already have an account?{" "}
            <button
              className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
              onClick={() => router.push("/login")}
              type="button"
            >
              Login
            </button>
          </div>
        </form>
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569',
          },
          success: {
            style: {
              background: '#064e3b',
              border: '1px solid #10b981',
            },
          },
          error: {
            style: {
              background: '#7f1d1d',
              border: '1px solid #ef4444',
            },
          },
        }}
      />
    </div>
  );
};

export default SignUpPage;
