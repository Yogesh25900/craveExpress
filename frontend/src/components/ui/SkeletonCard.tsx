export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded-full w-2/3" />
          <div className="h-4 bg-gray-200 rounded-full w-10" />
        </div>
        <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        <div className="flex justify-between pt-1">
          <div className="h-3 bg-gray-100 rounded-full w-20" />
          <div className="h-3 bg-gray-100 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}
