import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DEPARTMENT_ICONS } from "@/lib/constants";
import type { Department } from "@/lib/types";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("*, threads(id)")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
        <p className="text-muted-foreground">
          Browse all departments and their discussions.
        </p>
      </div>

      {!departments || departments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No departments have been created yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(departments as (Department & { threads?: { id: string }[] })[]).map(
            (dept) => {
              const icon =
                DEPARTMENT_ICONS[dept.slug] ?? DEPARTMENT_ICONS.default;
              const threadCount = dept.threads?.length ?? 0;

              return (
                <Link key={dept.id} href={`/departments/${dept.slug}`}>
                  <Card className="h-full transition-colors hover:bg-muted">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{icon}</span>
                        <div>
                          <CardTitle className="text-lg">
                            {dept.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {threadCount} thread{threadCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {dept.description && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {dept.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
