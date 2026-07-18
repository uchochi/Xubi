import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEPARTMENT_ICONS } from "@/lib/constants";
import ThreadList from "@/components/forum/ThreadList";
import type { Department } from "@/lib/types";

interface DepartmentDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DepartmentDetailPage({
  params,
}: DepartmentDetailPageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: department } = await supabase
    .from("departments")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!department) {
    notFound();
  }

  let isInstructorOrAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isInstructorOrAdmin =
      profile?.role === "instructor" || profile?.role === "admin";
  }

  const dept = department as Department;
  const icon = DEPARTMENT_ICONS[dept.slug] ?? DEPARTMENT_ICONS.default;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{icon}</span>
              <div>
                <CardTitle className="text-2xl">{dept.name}</CardTitle>
                {dept.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dept.description}
                  </p>
                )}
              </div>
            </div>
            {isInstructorOrAdmin && (
              <Button asChild>
                <Link href={`/departments/${slug}/threads/new`}>
                  Create Thread
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <ThreadList departmentId={dept.id} departmentSlug={dept.slug} />
    </div>
  );
}
