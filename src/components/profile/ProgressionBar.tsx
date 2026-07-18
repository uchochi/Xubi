"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressionBarProps {
  score: number;
  maxScore?: number;
}

function getLevel(score: number): string {
  if (score >= 450) return "Master";
  if (score >= 300) return "Expert";
  if (score >= 150) return "Practitioner";
  if (score >= 50) return "Learner";
  return "Novice";
}

function getLevelColor(score: number): string {
  if (score >= 450)
    return "from-amber-400 via-yellow-500 to-amber-600";
  if (score >= 300)
    return "from-green-400 via-emerald-500 to-amber-500";
  if (score >= 150)
    return "from-blue-400 via-green-400 to-emerald-500";
  if (score >= 50)
    return "from-blue-400 via-blue-500 to-blue-600";
  return "from-blue-300 to-blue-400";
}

function getLevelTextColor(score: number): string {
  if (score >= 450) return "text-amber-600";
  if (score >= 300) return "text-emerald-600";
  if (score >= 150) return "text-green-600";
  if (score >= 50) return "text-blue-600";
  return "text-blue-500";
}

export default function ProgressionBar({
  score,
  maxScore = 500,
}: ProgressionBarProps) {
  const [mounted, setMounted] = useState(false);
  const percentage = Math.min(100, (score / maxScore) * 100);
  const level = getLevel(score);
  const gradient = getLevelColor(score);
  const textColor = getLevelTextColor(score);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div className="w-full space-y-2">
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",
            gradient
          )}
          style={{
            width: mounted ? `${percentage}%` : "0%",
          }}
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          <span className={textColor}>{score}</span>
          <span className="text-muted-foreground"> / {maxScore}</span>
        </span>
        <span className={cn("font-semibold", textColor)}>{level}</span>
      </div>
    </div>
  );
}
