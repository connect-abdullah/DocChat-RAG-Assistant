import { supabase } from "@/lib/supabase";

export const submitMessage = async (
  name: string,
  message: string,
  userId: string
) => {
  const { status, error } = await supabase
    .from("messages")
    .insert({ name, message, user_id: userId });

  if (error) return console.error(error);
  return status;
};

export const fetchMessages = async () => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return console.error(error);
  return data;
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
