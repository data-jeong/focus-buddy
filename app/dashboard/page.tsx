import { createClient } from '@/lib/supabase/server'
import TodoWidget from '@/components/dashboard/TodoWidget'
import ScheduleWidget from '@/components/dashboard/ScheduleWidget'
import QuickActions from '@/components/dashboard/QuickActions'
import CurrentTask from '@/components/dashboard/CurrentTask'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get start and end of today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [todosResponse, schedulesResponse] = await Promise.all([
    supabase
      .from('todos')
      .select('*')
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('schedules')
      .select('*')
      .order('start_time', { ascending: true })
  ])

  return (
    <div className="space-y-6">
      {/* Current Task Focus */}
      <CurrentTask />
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoWidget initialTodos={todosResponse.data || []} />
        <ScheduleWidget initialSchedules={schedulesResponse.data || []} />
      </div>
    </div>
  )
}