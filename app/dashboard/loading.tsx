import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" message="대시보드를 불러오는 중..." />
    </div>
  )
}