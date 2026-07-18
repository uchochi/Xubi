"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { SKILL_LEVELS, RESPONSE_MODES } from "@/lib/constants";
import type { Thread, User } from "@/lib/types";
import CreateThreadModal from "./CreateThreadModal";
import { Plus, Pin, MessageSquare, Lock } from "lucide-react";

interface ThreadListProps {
  departmentId: string;
  departmentSlug?: string;
}

export default function ThreadList({ departmentId, departmentSlug: departmentSlugProp }: ThreadListProps) {
  const [threads, setThreads] = useState<(Thread & { author?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [departmentSlug, setDepartmentSlug] = useState(departmentSlugProp ?? "");
  const supabase = createClient();

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    if (!departmentSlugProp) {
      const { data: dept } = await supabase
        .from("departments")
        .select("slug")
        .eq("id", departmentId)
        .single();
      if (dept) setDepartmentSlug(dept.slug);
    }

    const { data } = await supabase
      .from("threads")
      .select("*, author:users!threads_created_by_fkey(*)")
      .eq("department_id", departmentId)
      .eq("is_archived", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setThreads(data);
    setLoading(false);
  }, [departmentId, supabase]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const getSkillBadge = (level: number) => {
    const skill = SKILL_LEVELS.find((s) => s.value === level);
    if (!skill) return null;
    return (
      <Badge variant="secondary" className={cn("text-xs", skill.color)}>
        {skill.label}
      </Badge>
    );
  };

  const getResponseModeLabel = (mode: string) => {
    const rm = RESPONSE_MODES.find((r) => r.value === mode);
    return rm?.label ?? mode;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-2/3 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-1/3 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Threads</h2>
        <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Thread
        </Button>
      </div>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No threads yet. Be the first to start a discussion!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/departments/${departmentSlug}/threads/${thread.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarImage src={thread.author?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(thread.author?.name ?? "U")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {thread.is_pinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-sm truncate">
                          {thread.title}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span>{thread.author?.name ?? "Unknown"}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(thread.created_at)}</span>
                        {thread.post_count !== undefined && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {thread.post_count}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getSkillBadge(thread.skill_level)}
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                        {getResponseModeLabel(thread.response_type)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateThreadModal
        departmentId={departmentId}
        departmentSlug={departmentSlug}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
