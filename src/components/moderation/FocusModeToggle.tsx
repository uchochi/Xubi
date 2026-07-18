"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusModeToggleProps {
  threadId: string;
  initialState: boolean;
  onSuccess?: () => void;
}

export default function FocusModeToggle({
  threadId,
  initialState,
  onSuccess,
}: FocusModeToggleProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [enabled, setEnabled] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (
        profile &&
        (profile.role === "instructor" || profile.role === "admin")
      ) {
        setVisible(true);
      }
    })();
  }, [user, supabase]);

  const toggle = async () => {
    if (!user || loading) return;
    setLoading(true);

    const newState = !enabled;
    const { error } = await supabase
      .from("threads")
      .update({ focus_mode: newState })
      .eq("id", threadId);

    if (!error) {
      setEnabled(newState);
      onSuccess?.();
    }

    setLoading(false);
  };

  if (!visible) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={cn(
        "gap-1.5 transition-colors",
        enabled
          ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : ""
      )}
    >
      {enabled ? (
        <>
          <Eye className="h-4 w-4" />
          <span>Focus Mode</span>
          <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          <span>Focus Mode</span>
        </>
      )}
    </Button>
  );
}
