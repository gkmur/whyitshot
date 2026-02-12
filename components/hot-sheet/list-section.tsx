"use client";

interface FieldConfig {
  key: string;
  placeholder: string;
  wide?: boolean;
}

interface ListSectionProps<T extends { id: string }> {
  heading: string;
  emoji?: string;
  items: T[];
  fields: FieldConfig[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, key: string, value: string) => void;
  addLabel?: string;
}

export function ListSection<T extends { id: string }>({
  heading,
  emoji,
  items,
  fields,
  onAdd,
  onRemove,
  onUpdate,
  addLabel = "Add item",
}: ListSectionProps<T>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {emoji && <span className="mr-1">{emoji}</span>}
          {heading}
        </h3>
        <button
          onClick={onAdd}
          className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
        >
          + {addLabel}
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-gray-300 italic">No items yet</p>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-2 items-start group"
          >
            <div className="flex-1 flex gap-2 flex-wrap">
              {fields.map((field) => (
                <input
                  key={field.key}
                  type="text"
                  value={(item as Record<string, unknown>)[field.key] as string ?? ""}
                  onChange={(e) => onUpdate(item.id, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`text-sm bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-accent outline-none ${
                    field.wide ? "flex-1 min-w-0" : "w-36"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="text-gray-300 hover:text-red-400 transition-colors text-xs mt-1.5 opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
