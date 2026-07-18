"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MODERATION_DURATIONS } from "@/lib/constants";
import { Pause } from "lucide-react";

interface PauseButtonProps {
  targetUserId: string;
  targetUserName: string;
  onSuccess?: () => void;
}

export default function PauseButton({
  targetUserId,
  targetUserName,
  onSuccess,
}: PauseButtonProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<string>("24");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: callerProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (
        callerProfile &&
        (callerProfile.role === "instructor" || callerProfile.role === "admin")
      ) {
        setVisible(true);
        const { data: targetProfile } = await supabase
          .from("users")
          .select("is_paused")
          .eq("id", targetUserId)
          .single();
        if (targetProfile) setIsMuted(targetProfile.is_paused);
      }
    })();
  }, [user, supabase, targetUserId]);

  const handlePause = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    let mutedUntil: string | null = null;
    if (duration !== "0") {
      const hours = parseInt(duration, 10);
      const until = new Date();
      until.setHours(until.getHours() + hours);
      mutedUntil = until.toISOString();
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_paused: true,
        pause_until: mutedUntil,
        mute_reason: reason || null,
      })
      .eq("id", targetUserId);

    if (updateError) {
      setError("Failed to pause user. Please try again.");
      setLoading(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: targetUserId,
      type: "moderation",
      message: `Your account has been paused by a moderator.${
        reason ? ` Reason: ${reason}` : ""
      } ${
        mutedUntil
          ? `This will be automatically lifted at ${new Date(mutedUntil).toLocaleString()}.`
          : "This will remain until a manual review."
      }`,
      link: null,
    });

    setSuccess(true);
    setLoading(false);
    setIsMuted(true);
    onSuccess?.();

    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setDuration("24");
      setReason("");
    }, 1500);
  };

  const handleUnpause = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_paused: false,
        pause_until: null,
        mute_reason: null,
      })
      .eq("id", targetUserId);

    if (updateError) {
      setError("Failed to unpause user. Please try again.");
      setLoading(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: targetUserId,
      type: "moderation",
      message: "Your account has been unpaused. You can now post again.",
      link: null,
    });

    setSuccess(true);
    setLoading(false);
    setIsMuted(false);
    onSuccess?.();

    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
    }, 1500);
  };

  if (!visible) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setSuccess(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {isMuted ? (
          <Button variant="outline" size="sm">
            <span className="text-green-600">Unpause</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Pause className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isMuted
              ? `Unpause ${targetUserName}`
              : `Pause ${targetUserName}`}
          </DialogTitle>
          <DialogDescription>
            {isMuted
              ? "This will restore the user's ability to post and interact."
              : "This will prevent the user from posting and interacting. Optionally set a duration and reason."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-green-600">
              {isMuted
                ? "User unpaused successfully."
                : "User paused successfully."}
            </p>
          </div>
        ) : (
          <>
            {!isMuted && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pause-duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger id="pause-duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODERATION_DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pause-reason">Reason (optional)</Label>
                  <textarea
                    id="pause-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is this user being paused?"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={isMuted ? "default" : "destructive"}
                onClick={isMuted ? handleUnpause : handlePause}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : isMuted
                    ? "Confirm Unpause"
                    : "Pause User"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
