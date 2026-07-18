"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { getInitials, formatRelativeTime, cn } from "@/lib/utils";
import { SKILL_LEVELS } from "@/lib/constants";
import type {
  User,
  Thread,
  KnowledgeVerification,
} from "@/lib/types";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<User | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [verifications, setVerifications] = useState<KnowledgeVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    async function loadProfile() {
      setLoading(true);

      const { data: prof } = await supabase
        .from("users")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (!prof) {
        setLoading(false);
        return;
      }

      setProfile(prof as User);
      setFullName(prof.name ?? "");
      setAvatarUrl(prof.avatar_url ?? "");

      const [{ data: threadData }, { data: verifData }] = await Promise.all([
        supabase
          .from("threads")
          .select("*, department:departments(name, slug)")
          .eq("created_by", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("knowledge_verifications")
          .select("*, thread:threads(title, department:departments(name, slug)), verifier:users!knowledge_verifications_verified_by_fkey(name)")
          .eq("user_id", user!.id)
          .order("verified_at", { ascending: false }),
      ]);

      setThreads((threadData as any) ?? []);
      setVerifications((verifData as any) ?? []);
      setLoading(false);
    }

    loadProfile();
  }, [user, authLoading, supabase]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    setAvatarUrl(publicUrl);
    setUploading(false);
  }

  async function handleSave() {
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({
        name: fullName,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) =>
        prev ? { ...prev, name: fullName, avatar_url: avatarUrl || null } : prev
      );
      setEditing(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  const totalScore = verifications.reduce((sum, v) => sum + (v.score ?? 0), 0);
  const maxScore = Math.max(500, totalScore + 100);
  const scorePercentage = Math.min((totalScore / maxScore) * 100, 100);

  const skillLevel =
    SKILL_LEVELS.find(
      (l) =>
        totalScore >= (l.value - 1) * 100 && totalScore < l.value * 100
    ) ?? SKILL_LEVELS[SKILL_LEVELS.length - 1];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={editing ? avatarUrl : profile.avatar_url ?? undefined}
                  alt={profile.name ?? "User"}
                />
                <AvatarFallback className="text-2xl">
                  {getInitials(profile.name ?? "User")}
                </AvatarFallback>
              </Avatar>
              {editing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "..." : "+"}
                  </Button>
                </>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              {editing ? (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Badge variant="secondary">
                      {profile.role.replace("_", " ")}
                    </Badge>
                    <Badge className={skillLevel.color}>
                      {skillLevel.label}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="threads">
            Threads ({threads.length})
          </TabsTrigger>
          <TabsTrigger value="verifications">
            Verifications ({verifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Threads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{threads.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Verifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{verifications.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalScore}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="threads" className="mt-4">
          <Card>
            <CardContent className="py-6">
              {threads.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  You haven&apos;t created any threads yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {threads.map((thread: any) => {
                    const dept = thread.department;
                    return (
                      <li key={thread.id}>
                        <Link
                          href={`/departments/${dept?.slug ?? "unknown"}/threads/${thread.id}`}
                          className="block rounded-lg p-3 transition-colors hover:bg-muted"
                        >
                          <p className="text-sm font-medium">{thread.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {thread.skill_level}
                            </Badge>
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
                        <Separator className="mt-3" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="mt-4">
          <Card>
            <CardContent className="py-6">
              {verifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  No verifications yet. Keep learning and contributing!
                </p>
              ) : (
                <ul className="space-y-3">
                  {verifications.map((verif: any) => (
                    <li key={verif.id}>
                      <div className="rounded-lg p-3 transition-colors hover:bg-muted">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {verif.thread?.title ?? "Thread"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Verified by {verif.verifier?.name ?? "Unknown"}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-800">
                              +{verif.score} pts
                            </Badge>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatRelativeTime(verif.verified_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Separator className="mt-3" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
