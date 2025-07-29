import { useEffect, useState } from "react";
import { listFiles } from "@/server/server.actions";
import { User } from "@/constants/types";
import { FileObject } from "@/constants/types";
import { supabase } from "@/lib/supabase";

export default function ShowFiles({ user }: { user: User }) {
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
        console.log(data)
        if (Array.isArray(data)) {
          setFiles(data);
        } else {
          setError("Failed to fetch files.");
        }
      } catch (err) {
        setError("An error occurred while fetching files.");
      }
      setLoading(false);
    };
    fetchFiles();
  }, [user]);

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

  return (
    <>
      <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center">Your Files</h2>
      {loading ? (
        <p className="text-center text-gray-300">Loading...</p>
      ) : error ? (
        <p className="text-center text-red-400">{error}</p>
      ) : files.length === 0 ? (
        <p className="text-center text-gray-400">No files found.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <ul className="divide-y divide-gray-700">
            {files.map((file) => (
              <li key={file.name} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex-1">
                  <span className="font-semibold text-blue-300">{file.name}</span>
                  {file.updated_at && (
                    <div className="text-xs text-gray-400">
                      Updated: {new Date(file.updated_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(file.name)}
                  disabled={downloading === file.name}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    downloading === file.name
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {downloading === file.name ? "Downloading..." : "Download"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
