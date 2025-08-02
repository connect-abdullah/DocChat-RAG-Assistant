import { useEffect, useState } from "react";
import { listFiles } from "@/server/server.actions";
import { User } from "@/constants/types";
import { FileObject } from "@/constants/types";
import { supabase } from "@/db/supabase";

interface ShowFilesProps {
  user: User;
  onFileSelect?: (fileName: string | null) => void;
  selectedFile?: string | null;
}

export default function ShowFiles({ user, onFileSelect, selectedFile }: ShowFilesProps) {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError("");
      try {
        if (!user?.id) {
          setError("User not found.");
          setLoading(false);
          return;
        }
        const data = await listFiles(user?.id);
        if (Array.isArray(data)) {
          setFiles(data);
        } else {
          setError("Failed to fetch files.");
        }
      } catch  {
        setError("An error occurred while fetching files.");
      }
      setLoading(false);
    };
    fetchFiles();
  }, [user]);

  const handleFileClick = (fileName: string) => {
    if (onFileSelect) {
      onFileSelect(selectedFile === fileName ? null : fileName);
    }
  };

  const handleDownload = async (fileName: string) => {
    setDownloading(fileName);
    try {
      const filePath = `${user.id}/${fileName}`;
      const { data, error } = await supabase.storage
        .from("user-files")
        .download(filePath);

      if (error) {
        console.error("Download error:", error);
        alert("Failed to download file.");
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download file.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-10 sm:h-12 bg-slate-700/50 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-xs sm:text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-700/50 rounded-lg flex items-center justify-center mx-auto mb-3">
          <svg className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">No documents yet</p>
        <p className="text-xs text-slate-500 mt-1">Upload a document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.name}
          className={`p-2 sm:p-3 rounded-lg border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
            selectedFile === file.name
              ? "bg-emerald-900/20 border-emerald-500/50 shadow-emerald-500/25"
              : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50"
          }`}
          onClick={() => handleFileClick(file.name)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                  {file.name}
                </p>
                {file.updated_at && (
                  <p className="text-xs text-slate-400">
                    {new Date(file.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(file.name);
              }}
              disabled={downloading === file.name}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Download"
            >
              {downloading === file.name ? (
                <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
