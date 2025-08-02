import { supabase } from "@/db/supabase";

export const saveMessage = async ({
  sessionId,
  role,
  content,
}: {
  sessionId: string;
  role: "user" | "ai";
  content: string;
}) => {
  const { error } = await supabase.from("messages").insert({
    session_id: sessionId,
    role,
    content,
  });

  if (error) {
    console.error("Failed to save message:", error);
    throw new Error("Failed to save message");
  }
};

export const fetchMessages = async () => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return console.error(error);
  return data;
};

export const createSession = async (userId: string, documentId?: string, documentName?: string) => {
  const sessionData: { user_id: string; document_id?: string; document_name?: string } = { user_id: userId };
  
  if (documentId) {
    sessionData.document_id = documentId;
  }
  
  if (documentName) {
    sessionData.document_name = documentName;
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    throw new Error("Unable to create chat session");
  }

  return data.id; // session UUID
};

export const signUp = async (name: string, email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    console.error(error);
    return error.status;
  }
  // console.log("data -->>",data)
  return data;
};

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error);
    return error.status;
  }
  // console.log("login data -->>", data)
  return data;
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting user:", error);
    return null;
  }

  return user;
};

export const uploadFile = async (
  filePath: string,
  file: File,
  userId: string
) => {
  const { data, error: uploadError } = await supabase.storage
    .from("user-files")
    .upload(filePath, file);
  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { error: uploadError };
  }

  const ext = filePath.split(".").pop()?.toLowerCase();

  // Insert document row
  const { data: insertData, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      name: file.name,
      path: filePath,
      ext
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert Error:", insertError);
    return { error: insertError };
  }

  const documentId = insertData.id;

  return { success: true, documentId };
};

export const listFiles = async (userId: string) => {
  const { data, error } = await supabase.storage
    .from("user-files")
    .list(userId, { limit: 100 });
  if (error) {
    console.error(error);
    return error;
  }

  return data;
};

export const fetchLastMessages = async (sessionId: string, limit: number = 5) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data || [];
};

export const getDocumentByFileName = async (fileName: string, userId: string) => {
  // fileName is already the original filename (like "CV.pdf")
  // Construct the full path: userId/filename
  const fullPath = `${userId}/${fileName}`;
  
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, path")
    .eq("user_id", userId)
    .eq("path", fullPath)
    .single();

  if (error) {
    console.error("Error fetching document:", error);
    return null;
  }

  return data;
};

export const findExistingSession = async (userId: string, documentId: string) => {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, document_name")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error finding existing session:", error);
    return null;
  }

  return data;
};
