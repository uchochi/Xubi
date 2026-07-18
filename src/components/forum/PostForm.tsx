"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { REACTION_EMOJIS, GUIDED_TEMPLATES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Send, AlertCircle } from "lucide-react";

interface PostFormProps {
  threadId: string;
  threadResponseMode: string;
  parentId?: string;
  isMuted: boolean;
  onPostCreated: () => void;
}

export default function PostForm({
  threadId,
  threadResponseMode,
  parentId,
  isMuted,
  onPostCreated,
}: PostFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [guidedValues, setGuidedValues] = useState({
    what_i_learned: "",
    what_im_struggling_with: "",
    my_action_item: "",
  });
  const supabase = createClient();

  if (isMuted) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          Your posting privileges are currently paused.
        </div>
      </div>
    );
  }

  const handleSubmit = async (bodyText: string) => {
    if (!bodyText.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("posts").insert({
      thread_id: threadId,
      content: bodyText.trim(),
      parent_id: parentId ?? null,
    });

    if (!error) {
      setBody("");
      setGuidedValues({
        what_i_learned: "",
        what_im_struggling_with: "",
        my_action_item: "",
      });
      onPostCreated();
    }

    setSubmitting(false);
  };

  const handleIconOnlyEmoji = async (emoji: string) => {
    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({
      thread_id: threadId,
      content: emoji,
      parent_id: parentId ?? null,
    });

    if (!error) {
      onPostCreated();
    }
    setSubmitting(false);
  };

  if (threadResponseMode === "icon_only") {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-2 font-medium">
          React with an emoji:
        </p>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleIconOnlyEmoji(emoji)}
              disabled={submitting}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-muted transition-colors disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (threadResponseMode === "guided") {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {GUIDED_TEMPLATES.what_i_learned}
          </label>
          <textarea
            value={guidedValues.what_i_learned}
            onChange={(e) =>
              setGuidedValues((prev) => ({
                ...prev,
                what_i_learned: e.target.value,
              }))
            }
            placeholder="Share what you've learned..."
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {GUIDED_TEMPLATES.what_im_struggling_with}
          </label>
          <textarea
            value={guidedValues.what_im_struggling_with}
            onChange={(e) =>
              setGuidedValues((prev) => ({
                ...prev,
                what_im_struggling_with: e.target.value,
              }))
            }
            placeholder="What concepts are confusing?"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {GUIDED_TEMPLATES.my_action_item}
          </label>
          <textarea
            value={guidedValues.my_action_item}
            onChange={(e) =>
              setGuidedValues((prev) => ({
                ...prev,
                my_action_item: e.target.value,
              }))
            }
            placeholder="What will you do next?"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            rows={2}
          />
        </div>
        <Button
          onClick={() => {
            const combined = [
              guidedValues.what_i_learned &&
                `${GUIDED_TEMPLATES.what_i_learned}\n${guidedValues.what_i_learned}`,
              guidedValues.what_im_struggling_with &&
                `${GUIDED_TEMPLATES.what_im_struggling_with}\n${guidedValues.what_im_struggling_with}`,
              guidedValues.my_action_item &&
                `${GUIDED_TEMPLATES.my_action_item}\n${guidedValues.my_action_item}`,
            ]
              .filter(Boolean)
              .join("\n\n");
            handleSubmit(combined);
          }}
          disabled={submitting}
          size="sm"
          className="gap-1"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Posting..." : "Post Reply"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply..."
          className="flex min-h-[80px] flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit(body);
            }
          }}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <Button
          onClick={() => handleSubmit(body)}
          disabled={submitting || !body.trim()}
          size="sm"
          className="gap-1"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Posting..." : "Post Reply"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Press Ctrl+Enter to submit
      </p>
    </div>
  );
}
