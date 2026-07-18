"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";

interface LinkParserProps {
  children: string;
}

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/g;

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    },
    [url]
  );

  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-blue-600 group-hover:opacity-100"
      title="Copy link"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function LinkParser({ children }: LinkParserProps) {
  if (!children) return null;

  const parts: (string | { url: string; key: number })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_REGEX.source, "g");

  while ((match = regex.exec(children)) !== null) {
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index));
    }
    parts.push({ url: match[0], key: match.index });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  if (parts.length === 0) {
    return <span>{children}</span>;
  }

  return (
    <span>
      {parts.map((part) => {
        if (typeof part === "string") {
          return <span key={`text-${part.length}-${part.charCodeAt(0)}`}>{part}</span>;
        }

        const href = part.url.startsWith("www.") ? `https://${part.url}` : part.url;

        return (
          <span key={part.key} className="group/link inline-flex items-center">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 transition-colors"
            >
              {part.url}
            </a>
            <CopyButton url={href} />
          </span>
        );
      })}
    </span>
  );
}
