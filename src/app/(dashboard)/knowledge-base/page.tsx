import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { DEPARTMENT_ICONS } from "@/lib/constants";

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  department_id: string | null;
  author_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  departments?: {
    name: string;
    slug: string;
  } | null;
}

export default async function KnowledgeBasePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: articles } = await supabase
    .from("knowledge_base_articles")
    .select("*, departments(name, slug)")
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Browse articles and resources from across the portal.
          </p>
        </div>
        {isInstructorOrAdmin && (
          <Button asChild>
            <Link href="/knowledge-base/new">Create Article</Link>
          </Button>
        )}
      </div>

      {!articles || articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No published articles yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(articles as KnowledgeArticle[]).map((article) => {
            const dept = article.departments;
            const icon = dept
              ? DEPARTMENT_ICONS[dept.slug] ?? DEPARTMENT_ICONS.default
              : null;

            return (
              <Link
                key={article.id}
                href={`/knowledge-base/${article.id}`}
              >
                <Card className="h-full transition-colors hover:bg-muted">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-lg">
                        {article.title}
                      </CardTitle>
                      {icon && <span className="shrink-0 text-xl">{icon}</span>}
                    </div>
                    {article.excerpt && (
                      <CardDescription className="line-clamp-3">
                        {article.excerpt}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {dept && (
                        <Badge variant="outline" className="text-xs">
                          {dept.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(article.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
