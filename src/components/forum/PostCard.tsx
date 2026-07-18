"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { REACTION_EMOJIS } from "@/lib/constants";
import type { Post, Reaction } from "@/lib/types";
import LinkParser from "./LinkParser";
import { Check, Award, Plus, X } from "lucide-react";

interface PostCardProps {
  post: Post;
  threadId: string;
  currentUserId: string;
  isMuted: boolean;
  isInstructor: boolean;
}

export default function PostCard({
  post,
  threadId,
  currentUserId,
  isMuted,
  isInstructor,
}: PostCardProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>(post.reactions ?? []);
  const [isSolution, setIsSolution] = useState(post.is_solution);
  const [verifying, setVerifying] = useState(false);
  const supabase = createClient();

  const groupedReactions = reactions.reduce<Record<string, { count: number; users: string[] }>>(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, users: [] };
      }
      acc[r.emoji].count += 1;
      acc[r.emoji].users.push(r.user_id);
      return acc;
    },
    {}
  );

  const handleReaction = async (emoji: string) => {
    const existing = reactions.find(
      (r) => r.user_id === currentUserId && r.emoji === emoji
    );

    if (existing) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("id", existing.id);
      if (!error) {
        setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      }
    } else {
      const { data, error } = await supabase
        .from("reactions")
        .insert({
          user_id: currentUserId,
          post_id: post.id,
          emoji,
        })
        .select()
        .single();
      if (!error && data) {
        setReactions((prev) => [...prev, data]);
      }
    }
    setShowReactionPicker(false);
  };

  const handleMarkSolution = async () => {
    const { error } = await supabase
      .from("posts")
      .update({ is_solution: !isSolution })
      .eq("id", post.id);
    if (!error) {
      setIsSolution((prev) => !prev);
    }
  };

  const handleVerifyMastery = async () => {
    setVerifying(true);
    const { error } = await supabase.from("knowledge_verifications").insert({
      user_id: post.user_id,
      thread_id: threadId,
      verified_by: currentUserId,
      score: 100,
    });
    setVerifying(false);
    if (error) {
      console.error("Failed to verify mastery:", error);
    }
  };

  return (
    <div className="group relative rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={post.author?.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(post.author?.name ?? "U")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">
              {post.author?.name ?? "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(post.created_at)}
            </span>
            {isSolution && (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 gap-1">
                <Check className="h-3 w-3" />
                Solution
              </Badge>
            )}
          </div>

          <div className="mt-2 text-sm leading-relaxed">
            <LinkParser>{post.content ?? ""}</LinkParser>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {Object.entries(groupedReactions).map(([emoji, { count, users }]) => {
              const userReacted = users.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    userReacted
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  title={`${count} ${count === 1 ? "reaction" : "reactions"}`}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}

            {!isMuted && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 rounded-full p-0 text-muted-foreground"
                  onClick={() => setShowReactionPicker((prev) => !prev)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>

                {showReactionPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowReactionPicker(false)}
                    />
                    <div className="absolute bottom-full left-0 z-50 mb-1 rounded-lg border bg-popover p-2 shadow-lg">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          React
                        </span>
                        <button
                          onClick={() => setShowReactionPicker(false)}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {isInstructor && (
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleMarkSolution}
            >
              <Check className="h-3 w-3" />
              {isSolution ? "Unmark" : "Solution"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleVerifyMastery}
              disabled={verifying}
            >
              <Award className="h-3 w-3" />
              Verify
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
