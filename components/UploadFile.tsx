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

    const filePath = `${user.id}/${file.name}`;
    const userId: string = user.id;

    const { documentId } = await uploadFile(filePath, file, userId);

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
    <div className="space-y-3">
      {!file ? (
        <label className="block">
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-3 sm:p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-900/20 transition-colors">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-900/50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-300">Drop file here or click to upload</p>
            <p className="text-xs text-gray-500 mt-1">PDF, DOCX up to 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
            accept=".pdf,.docx"
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                disabled={uploading}
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full px-3 py-2 bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs sm:text-sm">Uploading...</span>
              </div>
            ) : (
              "Upload Document"
            )}
          </button>
        </div>
      )}
      
      {message && (
        <div className="p-2 bg-green-900/20 border border-green-500 rounded-lg">
          <p className="text-xs text-green-400">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="p-2 bg-red-900/20 border border-red-500 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
