import { createBrowserClient } from "@supabase/ssr"
// import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
// import { cookies } from "next/headers"

// For Client-Side
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// For Server-Side
// export const createServerSupabase = async () => createServerComponentClient({cookies})

