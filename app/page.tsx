"use client";
import React, { useEffect, useState } from "react";
import { submitData, fetchData } from "@/server/server.actions";
import { getCurrentUser } from "@/server/server.actions";
import { useRouter } from "next/navigation";
import { User, Messages } from "@/constants/types";
import { supabase } from "@/lib/supabase";
import UploadFile from "@/components/UploadFile";
import ShowFiles from "@/components/ShowFiles";

const Page = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Messages[]>([]);
  const [sent, setSent] = useState(false);
  const [user, setUser] = useState<User>();

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const response = await getCurrentUser();
      // console.log(response);
      if (!response) {
        return router.push("/login");
      } else {
        setUser(response);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const getMessages = async () => {
      try {
        const response = await fetchData();
        if (response) {
          setMessages(response);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
    getMessages();
  }, [sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !message.trim()) {
      alert("Please fill in both fields.");
      return;
    }
    try {
      if (!user?.id) {
        alert("Please log in again.");
        return;
      }
      const userId: string = user.id;
      const response = await submitData(name, message, userId);

      if (response) {
        setName("");
        setMessage("");
        // alert("Message submitted successfully!");
        setSent(!sent);
      } else {
        alert("Failed to submit message.");
      }
    } catch (error) {
      alert("An unexpected error occurred.");
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // or homepage
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 flex justify-between items-center">
          <div className="flex justify-center items-center gap-8">
            <h1 className="text-3xl font-bold text-blue-400">Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-gray-300">{user?.user_metadata?.name || 'User'}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Message Form */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-center text-blue-400 mb-6">
              Message Form
            </h2>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="text-gray-200 font-medium">
                Name:
                <input
                  type="text"
                  className="block w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:border-blue-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="text-gray-200 font-medium">
                Message:
                <textarea
                  className="block w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:border-blue-500"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                className="py-3 bg-blue-600 text-white border-none rounded-md font-semibold text-base cursor-pointer transition-colors hover:bg-blue-700"
              >
                Submit
              </button>
            </form>
          </div>

          {/* Messages List */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-center text-blue-400 mb-6">
              Messages
            </h2>
            <div className="max-h-80 overflow-y-auto">
              <ul className="divide-y divide-gray-700">
                {messages?.map((message: Messages) => (
                  <li
                    key={message.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
                  >
                    <span className="font-semibold text-blue-400">
                      {message.name}
                    </span>
                    <span className="text-gray-300">{message.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Upload File */}
          {user && (
            <div className="bg-gray-800 rounded-xl shadow-lg p-6">
              <UploadFile user={user} />
            </div>
          )}

          {/* Show Files */}
          {user && (
            <div className="bg-gray-800 rounded-xl shadow-lg p-6">
              <ShowFiles user={user} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
