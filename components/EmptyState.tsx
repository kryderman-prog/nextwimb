export default function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="px-4 py-4 text-sm text-gray-600">
      <div className="font-medium text-gray-800">{title}</div>
      {description ? <div className="mt-1 text-xs text-gray-500">{description}</div> : null}
    </div>
  )
}

