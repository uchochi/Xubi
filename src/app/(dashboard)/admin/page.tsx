"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, getInitials, formatRelativeTime } from "@/lib/utils";
import type { User, Department, Thread, Post, KnowledgeVerification } from "@/lib/types";
import {
  Users,
  BarChart3,
  Plus,
  Edit,
  Check,
  X,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [totalThreads, setTotalThreads] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalVerifications, setTotalVerifications] = useState(0);

  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptDesc, setEditDeptDesc] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
  }, [user, supabase]);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUsers(data);
  }, [supabase]);

  const fetchDepartments = useCallback(async () => {
    const { data } = await supabase
      .from("departments")
      .select("*")
      .order("name");
    if (data) setDepartments(data);
  }, [supabase]);

  const fetchAnalytics = useCallback(async () => {
    const [threadsRes, postsRes, verificationsRes] = await Promise.all([
      supabase.from("threads").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase
        .from("knowledge_verifications")
        .select("id", { count: "exact", head: true }),
    ]);
    setTotalThreads(threadsRes.count ?? 0);
    setTotalPosts(postsRes.count ?? 0);
    setTotalVerifications(verificationsRes.count ?? 0);
  }, [supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/signin");
      return;
    }
    (async () => {
      await fetchProfile();
      setLoading(false);
    })();
  }, [user, authLoading, router, fetchProfile]);

  useEffect(() => {
    if (profile && profile.role !== "admin") {
      router.push("/");
      return;
    }
    if (profile?.role === "admin") {
      fetchUsers();
      fetchDepartments();
      fetchAnalytics();
    }
  }, [profile, router, fetchUsers, fetchDepartments, fetchAnalytics]);

  const updateUserRole = async (userId: string, newRole: string) => {
    await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole as User["role"] } : u
      )
    );
  };

  const createDepartment = async () => {
    if (!deptName.trim()) return;
    const slug = deptName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const { data, error } = await supabase
      .from("departments")
      .insert({ name: deptName.trim(), slug, description: deptDescription || null })
      .select()
      .single();
    if (!error && data) {
      setDepartments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setDeptName("");
      setDeptDescription("");
    }
  };

  const updateDepartment = async (deptId: string) => {
    if (!editDeptName.trim()) return;
    await supabase
      .from("departments")
      .update({
        name: editDeptName.trim(),
        description: editDeptDesc || null,
      })
      .eq("id", deptId);
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, name: editDeptName.trim(), description: editDeptDesc || null }
          : d
      )
    );
    setEditingDeptId(null);
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersPerDept = departments.map((dept) => ({
    ...dept,
    count: users.filter((u) => u.department_id === dept.id).length,
  }));

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground">
          You need admin privileges to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage users, departments, and view platform analytics.
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Users ({users.length})</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(u.name ?? "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.role.replace("_", " ")} &middot; Score: {u.knowledge_score}
                      </p>
                    </div>

                    {u.is_paused && (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        Muted
                      </Badge>
                    )}

                    <Select
                      value={u.role}
                      onValueChange={(val) => updateUserRole(u.id, val)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apprentice">Apprentice</SelectItem>
                        <SelectItem value="junior_staff">Junior Staff</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No users found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Manage department names and descriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="new-dept-name">New Department Name</Label>
                  <Input
                    id="new-dept-name"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="new-dept-desc">Description</Label>
                  <Input
                    id="new-dept-desc"
                    value={deptDescription}
                    onChange={(e) => setDeptDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <Button onClick={createDepartment} className="gap-1.5 shrink-0">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    {editingDeptId === dept.id ? (
                      <>
                        <Input
                          value={editDeptName}
                          onChange={(e) => setEditDeptName(e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          value={editDeptDesc}
                          onChange={(e) => setEditDeptDesc(e.target.value)}
                          placeholder="Description"
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateDepartment(dept.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingDeptId(null)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{dept.name}</p>
                          {dept.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {dept.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingDeptId(dept.id);
                            setEditDeptName(dept.name);
                            setEditDeptDesc(dept.description ?? "");
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No departments created yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="text-3xl">{users.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Threads</CardDescription>
                <CardTitle className="text-3xl">{totalThreads}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Posts</CardDescription>
                <CardTitle className="text-3xl">{totalPosts}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalVerifications}</p>
                <p className="text-sm text-muted-foreground">
                  Knowledge verifications completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users by Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {usersPerDept.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{dept.name}</span>
                    <Badge variant="secondary">{dept.count}</Badge>
                  </div>
                ))}
                {users.filter((u) => !u.department_id).length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unassigned</span>
                    <Badge variant="secondary">
                      {users.filter((u) => !u.department_id).length}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(["apprentice", "junior_staff", "instructor", "admin"] as const).map(
                  (role) => (
                    <div
                      key={role}
                      className="rounded-lg border p-3 text-center"
                    >
                      <p className="text-2xl font-bold">
                        {users.filter((u) => u.role === role).length}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {role.replace("_", " ")}
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
