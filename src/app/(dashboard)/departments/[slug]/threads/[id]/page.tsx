import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ThreadDetail from "@/components/forum/ThreadDetail";

interface ThreadPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("threads")
    .select("*, author:users!threads_created_by_fkey(*), department:departments(*)")
    .eq("id", id)
    .single();

  if (!thread) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("*, author:users!posts_user_id_fkey(*)")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  return (
    <ThreadDetail
      thread={thread as any}
      posts={(posts as any) ?? []}
    />
  );
}
