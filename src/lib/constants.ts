export const SKILL_LEVELS: { value: number; label: string; color: string }[] = [
  { value: 1, label: "Novice", color: "bg-blue-100 text-blue-800" },
  { value: 2, label: "Beginner", color: "bg-green-100 text-green-800" },
  { value: 3, label: "Intermediate", color: "bg-yellow-100 text-yellow-800" },
  { value: 4, label: "Advanced", color: "bg-orange-100 text-orange-800" },
  { value: 5, label: "Expert", color: "bg-red-100 text-red-800" },
];

export const RESPONSE_MODES: {
  value: string;
  label: string;
  description: string;
}[] = [
  { value: "open", label: "Open", description: "Standard text, links, and images" },
  { value: "icon_only", label: "Icon Only", description: "Reactions and stickers only" },
  { value: "guided", label: "Guided", description: "Structured template responses" },
];

export const MODERATION_DURATIONS = [
  { value: 1, label: "1 Hour" },
  { value: 24, label: "24 Hours" },
  { value: 0, label: "Until Manual Review" },
];

export const REACTION_EMOJIS = [
  "👍",
  "👎",
  "❤️",
  "🔥",
  "✅",
  "❌",
  "👀",
  "🎯",
  "💡",
  "🚀",
  "🎉",
  "💪",
  "🤔",
  "😊",
  "🫡",
  "⭐",
  "🏆",
  "📚",
  "✅",
  "🔍",
  "🛡️",
  "⚡",
  "🔧",
  "📊",
];

export const DEPARTMENT_ICONS: Record<string, string> = {
  engineering: "⚙️",
  marketing: "📣",
  logistics: "📦",
  design: "🎨",
  hr: "👥",
  finance: "💰",
  operations: "🏭",
  default: "📋",
};

export const GUIDED_TEMPLATES = {
  what_i_learned: "What I learned:",
  what_im_struggling_with: "What I'm struggling with:",
  my_action_item: "My action item:",
};
