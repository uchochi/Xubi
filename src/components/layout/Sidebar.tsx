"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, BookOpen, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavLink {
  label: string;
  icon: any;
  href: string;
}

interface Department {
  id: string;
  name: string;
  slug: string;
}

const navLinks: NavLink[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Knowledge Base", icon: BookOpen, href: "/knowledge-base" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndDepartments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setUserRole(profile?.role ?? null);
      }

      const { data: depts } = await supabase
        .from("departments")
        .select("id,name,slug")
        .order("name");
      if (depts) setDepartments(depts);
    };

    fetchUserAndDepartments();
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-background">
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive(link.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}

          {/* Departments */}
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/departments")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Building2 className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left">Departments</span>
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {expanded && (
              <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                {departments.map((dept) => (
                  <Link
                    key={dept.id}
                    href={`/departments/${dept.slug}`}
                    className={cn(
                      "block rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === `/departments/${dept.slug}`
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {dept.name}
                  </Link>
                ))}
                {departments.length === 0 && (
                  <p className="px-3 py-1.5 text-sm text-muted-foreground">No departments</p>
                )}
              </div>
            )}
          </div>

          {/* Admin - only for admin/instructor */}
          {(userRole === "admin" || userRole === "instructor") && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive("/admin")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
