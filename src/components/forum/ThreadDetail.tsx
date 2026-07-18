"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { SKILL_LEVELS, RESPONSE_MODES } from "@/lib/constants";
import type { Thread, Post, User } from "@/lib/types";
import LinkParser from "./LinkParser";
import PostCard from "./PostCard";
import PostForm from "./PostForm";

interface ThreadDetailProps {
  thread: Thread;
  initialPosts?: Post[];
  posts?: Post[];
}

export default function ThreadDetail({ thread, initialPosts, posts: postsProp }: ThreadDetailProps) {
  const [posts, setPosts] = useState<Post[]>(postsProp ?? initialPosts ?? []);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isInstructor, setIsInstructor] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from("users")
        .select("role, is_paused")
        .eq("id", user.id)
        .single();
      if (profile) {
        setIsInstructor(
          profile.role === "instructor" || profile.role === "admin"
        );
        setIsMuted(profile.is_paused);
      }
    }
  }, [supabase]);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select(
        `*, author:users!posts_user_id_fkey(*), reactions(*, user_id)`
      )
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });

    if (data) setPosts(data);
  }, [supabase, thread.id]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    const channel = supabase
      .channel(`thread-${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `thread_id=eq.${thread.id}`,
        },
        async () => {
          await fetchPosts();
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          }, 100);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, thread.id, fetchPosts]);

  const skill = SKILL_LEVELS.find((s) => s.value === thread.skill_level);
  const responseMode = RESPONSE_MODES.find(
    (r) => r.value === thread.response_type
  );

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card p-6">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={thread.author?.avatar_url ?? undefined} />
            <AvatarFallback>
              {getInitials(thread.author?.name ?? "U")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">{thread.title}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
              <span>{thread.author?.name ?? "Unknown"}</span>
              <span>·</span>
              <span>{formatRelativeTime(thread.created_at)}</span>
              {skill && (
                <Badge
                  variant="secondary"
                  className={cn("text-xs", skill.color)}
                >
                  {skill.label}
                </Badge>
              )}
              {responseMode && (
                <Badge variant="outline" className="text-xs">
                  {responseMode.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {thread.content && (
          <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">
            <LinkParser>{thread.content}</LinkParser>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-3">
          {posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No replies yet. Be the first to respond!
            </p>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                threadId={thread.id}
                currentUserId={currentUserId}
                isMuted={isMuted}
                isInstructor={isInstructor}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-4 bg-card">
        <PostForm
          threadId={thread.id}
          threadResponseMode={thread.response_type}
          isMuted={isMuted}
          onPostCreated={fetchPosts}
        />
      </div>
    </div>
  );
}
