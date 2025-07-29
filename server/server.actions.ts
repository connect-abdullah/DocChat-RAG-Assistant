import { supabase } from "@/lib/supabase";

export const submitData = async (
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

export const fetchData = async () => {
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

export const uploadFile = async (filePath:string,file : File) => {
    const {data,error} =  await supabase.storage.from("user-files").upload(filePath,file);
    if (error) {
        console.error(error);
        return error
    }

    return data;
}

export const listFiles = async (userId : string) => {
    const {data,error} = await supabase.storage.from("user-files").list(userId,{limit:100})
    if (error) {
        console.error(error);
        return error
    }

    return data;
}