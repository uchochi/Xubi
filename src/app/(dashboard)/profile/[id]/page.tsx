import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { SKILL_LEVELS } from "@/lib/constants";
import type { User, Thread, KnowledgeVerification } from "@/lib/types";

interface UserProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  const targetProfile = profile as User;

  let isViewerInstructorOrAdmin = false;
  if (currentUser) {
    const { data: viewerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    isViewerInstructorOrAdmin =
      viewerProfile?.role === "instructor" || viewerProfile?.role === "admin";
  }

  const [{ data: threads }, { data: verifications }] = await Promise.all([
    supabase
      .from("threads")
      .select("*, department:departments(name, slug)")
      .eq("created_by", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("knowledge_verifications")
      .select("*, thread:threads(title, department:departments(name, slug)), verifier:users!knowledge_verifications_verified_by_fkey(name)")
      .eq("user_id", id)
      .order("verified_at", { ascending: false }),
  ]);

  const totalScore = (verifications ?? []).reduce(
    (sum: number, v: any) => sum + (v.score ?? 0),
    0
  );
  const maxScore = Math.max(500, totalScore + 100);
  const scorePercentage = Math.min((totalScore / maxScore) * 100, 100);

  const skillLevel =
    SKILL_LEVELS.find(
      (l) =>
        totalScore >= (l.value - 1) * 100 && totalScore < l.value * 100
    ) ?? SKILL_LEVELS[SKILL_LEVELS.length - 1];

  async function pauseUser(formData: FormData) {
    "use server";

    const hours = Number(formData.get("duration") ?? 24);
    const reason = String(formData.get("reason") ?? "Moderation action");
    const mutedUntil =
      hours === 0
        ? null
        : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();
    await supabase
      .from("users")
      .update({
        is_paused: true,
        pause_until: mutedUntil,
        mute_reason: reason,
      })
      .eq("id", id);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={targetProfile.avatar_url ?? undefined}
                alt={targetProfile.name ?? "User"}
              />
              <AvatarFallback className="text-2xl">
                {getInitials(targetProfile.name ?? "User")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{targetProfile.name}</h1>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge variant="secondary">
                  {targetProfile.role.replace("_", " ")}
                </Badge>
                <Badge className={skillLevel.color}>
                  {skillLevel.label}
                </Badge>
                {targetProfile.is_paused && (
                  <Badge variant="destructive">Muted</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Member since {formatRelativeTime(targetProfile.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{totalScore}</span>
            <span className="text-sm text-muted-foreground">
              {skillLevel.label}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {totalScore} / {maxScore} points
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Threads</CardTitle>
        </CardHeader>
        <CardContent>
          {!threads || threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No threads created yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {(threads as any[]).map((thread) => {
                const dept = thread.department;
                return (
                  <li key={thread.id}>
                    <Link
                      href={`/departments/${dept?.slug ?? "unknown"}/threads/${thread.id}`}
                      className="block rounded-lg p-3 transition-colors hover:bg-muted"
                    >
                      <p className="text-sm font-medium">{thread.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {dept && (
                          <span className="text-xs text-muted-foreground">
                            {dept.name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(thread.created_at)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          {!verifications || verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verifications yet.</p>
          ) : (
            <ul className="space-y-3">
              {(verifications as any[]).map((verif) => (
                <li key={verif.id}>
                  <div className="flex items-start justify-between rounded-lg p-3 hover:bg-muted">
                    <div>
                      <p className="text-sm font-medium">
                        {verif.thread?.title ?? "Thread"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Verified by {verif.verifier?.name ?? "Unknown"}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      +{verif.score} pts
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isViewerInstructorOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Moderation</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={pauseUser} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="duration"
                  className="text-sm font-medium"
                >
                  Pause Duration (hours, 0 = until manual review)
                </label>
                <select
                  id="duration"
                  name="duration"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="1">1 Hour</option>
                  <option value="24">24 Hours</option>
                  <option value="0">Until Manual Review</option>
                </select>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="reason"
                  className="text-sm font-medium"
                >
                  Reason
                </label>
                <input
                  id="reason"
                  name="reason"
                  placeholder="Reason for pausing this user"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" variant="destructive">
                Pause User
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
