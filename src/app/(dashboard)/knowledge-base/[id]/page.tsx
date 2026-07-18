import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "@/lib/utils";
import { Edit, ArrowLeft } from "lucide-react";

interface KnowledgeBaseArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function KnowledgeBaseArticlePage({
  params,
}: KnowledgeBaseArticlePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("knowledge_base_articles")
    .select(
      `
      *,
      author:users!knowledge_base_articles_author_id_fkey(name, avatar_url),
      department:departments(name, slug)
    `
    )
    .eq("id", id)
    .single();

  if (!article) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isInstructor = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile && (profile.role === "instructor" || profile.role === "admin")) {
      isInstructor = true;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/knowledge-base">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold leading-tight">
            {article.title}
          </h1>
        </div>
        {isInstructor && (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>By {article.author?.name ?? "Unknown Author"}</span>
        {article.department && (
          <>
            <span>&middot;</span>
            <Badge variant="secondary" className="text-xs">
              {article.department.name}
            </Badge>
          </>
        )}
        <span>&middot;</span>
        <span>{formatRelativeTime(article.created_at)}</span>
      </div>

      <Separator />

      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
            {article.content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
