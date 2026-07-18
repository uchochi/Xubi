import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { DEPARTMENT_ICONS } from "@/lib/constants";
import type { User, Thread, Department } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/signin");
  }

  const isInstructorOrAdmin =
    profile.role === "instructor" || profile.role === "admin";

  const [
    { count: threadCount },
    { count: postCount },
    { data: verifications },
    { data: recentThreads },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("knowledge_verifications")
      .select("score")
      .eq("user_id", user.id),
    supabase
      .from("posts")
      .select("thread_id, created_at, threads!inner(id, title, department_id, departments!inner(name, slug))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("departments")
      .select("*, threads(id)")
      .order("name"),
  ]);

  const totalScore = (verifications ?? []).reduce(
    (sum, v) => sum + (v.score ?? 0),
    0
  );
  const verificationCount = verifications?.length ?? 0;

  const uniqueRecentThreads = (() => {
    const seen = new Set<string>();
    const result: {
      id: string;
      title: string;
      department_name: string;
      department_slug: string;
      created_at: string;
    }[] = [];
    for (const post of recentThreads ?? []) {
      const thread = post.threads as any;
      if (!thread || seen.has(thread.id)) continue;
      seen.add(thread.id);
      const dept = thread.departments as any;
      result.push({
        id: thread.id,
        title: thread.title,
        department_name: dept?.name ?? "Unknown",
        department_slug: dept?.slug ?? "",
        created_at: post.created_at,
      });
    }
    return result;
  })();

  let pendingVerifications = 0;
  if (isInstructorOrAdmin) {
    const { count } = await supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .eq("is_archived", false);
    pendingVerifications = count ?? 0;
  }

  const stats = [
    {
      title: "Threads Created",
      value: threadCount ?? 0,
      color: "text-blue-600",
    },
    {
      title: "Posts Made",
      value: postCount ?? 0,
      color: "text-green-600",
    },
    {
      title: "Knowledge Score",
      value: totalScore,
      color: "text-amber-600",
    },
    {
      title: "Verifications",
      value: verificationCount,
      color: "text-purple-600",
    },
  ];

  if (isInstructorOrAdmin) {
    stats.push({
      title: "Pending Reviews",
      value: pendingVerifications,
      color: "text-rose-600",
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
          <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {profile.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening on the XUBI Apprentice Learning Portal.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", stat.color)}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {uniqueRecentThreads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity. Start a thread to get going!
              </p>
            ) : (
              <ul className="space-y-3">
                {uniqueRecentThreads.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      href={`/departments/${thread.department_slug}/threads/${thread.id}`}
                      className="block rounded-lg p-3 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {thread.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {thread.department_name}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(thread.created_at)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Departments</span>
              <Link
                href="/departments"
                className="text-sm font-normal text-muted-foreground hover:text-foreground"
              >
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!departments || departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {departments.map((dept: Department & { threads?: { id: string }[] }) => {
                  const icon =
                    DEPARTMENT_ICONS[dept.slug] ?? DEPARTMENT_ICONS.default;
                  return (
                    <Link
                      key={dept.id}
                      href={`/departments/${dept.slug}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                      <span className="text-2xl">{icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {dept.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dept.threads?.length ?? 0} threads
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
