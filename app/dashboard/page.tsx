import { createClient } from '@/lib/supabase/server'
import TodoWidget from '@/components/dashboard/TodoWidget'
import ScheduleWidget from '@/components/dashboard/ScheduleWidget'
import QuickActions from '@/components/dashboard/QuickActions'
import CurrentTask from '@/components/dashboard/CurrentTask'

export default async function DashboardPage() {
  const supabase = await createClient()
  
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
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5)
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