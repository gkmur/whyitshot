"use client";

import { useCallback, useRef, useEffect } from "react";

interface ProseSectionProps {
  heading: string;
  emoji?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ProseSection({
  heading,
  emoji,
  value,
  onChange,
  placeholder,
}: ProseSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        {emoji && <span className="mr-1">{emoji}</span>}
        {heading}
      </h3>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          resize();
        }}
        placeholder={placeholder}
        rows={3}
        className="w-full text-sm text-gray-800 bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-2 resize-none focus:ring-1 focus:ring-accent focus:border-accent outline-none leading-relaxed"
      />
    </div>
  );
}
