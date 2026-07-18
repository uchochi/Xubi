export type UserRole = "apprentice" | "junior_staff" | "instructor" | "senior_instructor" | "admin";

export type ResponseType = "open" | "icon_only" | "guided";

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  department_id: string | null;
  knowledge_score: number;
  is_paused: boolean;
  pause_until: string | null;
  is_muted: boolean;
  avatar_url: string | null;
  mute_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_restricted: boolean;
  allowed_roles: string[];
  created_at: string;
}

export interface Thread {
  id: string;
  title: string;
  content: string | null;
  response_type: ResponseType;
  department_id: string;
  created_by: string;
  skill_level: number;
  is_focus_mode: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: User;
  department?: Department;
  post_count?: number;
}

export interface Post {
  id: string;
  thread_id: string;
  user_id: string;
  content: string | null;
  type: string;
  emoji_only: boolean;
  link_sanitized: boolean;
  is_solution: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author?: User;
  reaction_count?: number;
  reactions?: Reaction[];
}

export interface Reaction {
  id: string;
  user_id: string;
  post_id: string | null;
  thread_id: string | null;
  emoji: string;
  created_at: string;
}

export interface KnowledgeVerification {
  id: string;
  user_id: string;
  thread_id: string;
  verified_by: string;
  score: number;
  verified_at: string;
  thread?: Thread;
  verifier?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface ModerationAction {
  id: string;
  user_id: string;
  moderator_id: string;
  action_type: string;
  duration: string | null;
  reason: string | null;
  created_at: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  department_id: string | null;
  author_id: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
