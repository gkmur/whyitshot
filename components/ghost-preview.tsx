export function GhostPreview() {
  const heights = [140, 160, 150];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[720px] mx-auto pointer-events-none select-none opacity-40">
      {heights.map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-full rounded-xl bg-gray-100" style={{ height: h }} />
          <div className="w-3/4 h-3 rounded bg-gray-100" />
          <div className="w-1/2 h-2.5 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}
