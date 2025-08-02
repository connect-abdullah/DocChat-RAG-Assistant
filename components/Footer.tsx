import React from 'react';
import toast from 'react-hot-toast';
import { useRouter } from "next/navigation";
import { supabase } from "@/db/supabase";
import { testAPI } from "@/server/test-api";
import { getDocumentByFileName } from "@/server/server.actions";
import { queryRelevantChunks } from "@/server/embed.actions";

export interface FooterProps {
  user?: { id: string };
  selectedFile?: string | null;
}

const Footer: React.FC<FooterProps> = ({ user, selectedFile }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

//   const handleTestAPI = async () => {
//     const result = await testAPI();
//     toast.success(result);
//   };

//   const handleTestDocument = async () => {
//     if (!selectedFile || !user?.id) {
//       toast.error("Please select a file first");
//       return;
//     }

//     // Test document loading
//     const document = await getDocumentByFileName(selectedFile, user.id);

//     // Test vector search
//     if (document) {
//       const chunks = await queryRelevantChunks("test question", document.id);
//       toast.success(`Document found: ${document.name}\nChunks found: ${chunks.length}`);
//     } else {
//       toast.error("Document not found in database");
//     }
//   };

  return (
    <div className=" p-[1px] space-y-2 ">
      {/* <button
        onClick={handleTestAPI}
        className="w-full px-3 py-2 text-sm text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        Test API
      </button>
      <button
        onClick={handleTestDocument}
        className="w-full px-3 py-2 text-sm text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors"
      >
        Test Document
      </button> */}
      <button
        onClick={handleLogout}
        className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
};

export default Footer;