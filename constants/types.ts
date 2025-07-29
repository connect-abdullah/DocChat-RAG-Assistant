export interface UserMetadata {
  name?: string;
  email?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  sub?: string;
  [key: string]: string | number | boolean | null | undefined | object;
}

export interface User {
  id: string;
  app_metadata: UserMetadata;
  user_metadata: UserMetadata;
  aud: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  email_change_sent_at?: string;
  new_email?: string;
  new_phone?: string;
  invited_at?: string;
  action_link?: string;
  email?: string;
  phone?: string;
  created_at: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  role?: string;
  updated_at?: string;
  is_anonymous?: boolean;
  is_sso_user?: boolean;
  deleted_at?: string;
}

export interface Messages {
  id?: string;
  name?: string;
  message?: string;
  created_at?: string;
}

export type FileObject = {
    name: string;
    id?: string;
    updated_at?: string;
    created_at?: string;
    last_accessed_at?: string;
    metadata?: Record<string, unknown>;
  }