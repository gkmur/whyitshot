"use client";

import { type ListingInfo } from "@/types/hot-sheet";

interface ListingInfoSectionProps {
  data: ListingInfo;
  onChange: (data: ListingInfo) => void;
}

export function ListingInfoSection({ data, onChange }: ListingInfoSectionProps) {
  const update = (key: keyof ListingInfo, value: string | boolean) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Listing Information</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lead Time" value={data.leadTime} onChange={(v) => update("leadTime", v)} placeholder="e.g. 3-4 Months" />
        <Field label="Min Order Value" value={data.minOrderValue} onChange={(v) => update("minOrderValue", v)} placeholder="e.g. $10K" />
        <Field label="Max Order Value" value={data.maxOrderValue} onChange={(v) => update("maxOrderValue", v)} placeholder="e.g. $500K" />
        <Field label="Link to Listing" value={data.link} onChange={(v) => update("link", v)} placeholder="https://..." />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer mt-1">
        <input
          type="checkbox"
          checked={data.availableForDotcom}
          onChange={(e) => update("availableForDotcom", e.target.checked)}
          className="rounded border-gray-300 text-accent focus:ring-accent"
        />
        Available for Dot.com
      </label>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-0.5 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-accent outline-none"
      />
    </div>
  );
}
