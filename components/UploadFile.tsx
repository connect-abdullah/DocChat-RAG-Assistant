import { useState, useRef } from "react";
import { User } from "@/constants/types";
import { uploadFile } from "@/server/server.actions";
import { parseText } from "@/server/textParse.actions";

export default function UploadFile({ user }: { user: User }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage("");
    setError("");

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const userId: string = user.id;

    const { documentId } = await uploadFile(filePath, file, userId);
    // console.log("response -->" , documentId)

    if (!documentId) {
      setError("Upload failed. Please try again.");
    } else {
      setMessage("File uploaded successfully!");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await parseText(documentId);
    }

    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage("");
    setError("");
    setFile(e.target.files?.[0] || null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setMessage("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center">
        Upload a File
      </h2>
      <div className="flex flex-col gap-6">
        {!file ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-500 rounded-lg p-6 cursor-pointer bg-gray-900 hover:bg-gray-700 transition-colors">
            <span className="text-gray-300 mb-2 text-lg font-medium">
              Click to select a file
            </span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <span className="text-xs text-gray-500">
              (Max 10MB, any file type)
            </span>
          </label>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-blue-300 font-medium truncate max-w-[180px]">
                {file.name}
              </span>
              <span className="text-xs text-gray-400">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRemoveFile}
                className="px-3 py-1 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors text-sm"
                disabled={uploading}
                type="button"
              >
                Remove
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-colors ${
                  uploading
                    ? "bg-blue-300 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                type="button"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        )}
        {message && (
          <p className="mt-2 text-center text-sm text-green-400">{message}</p>
        )}
        {error && (
          <p className="mt-2 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </>
  );
}
