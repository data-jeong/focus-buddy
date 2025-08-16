import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { title, body, userId } = await request.json()
    const supabase = await createClient()
    
    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
    
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: 'No push subscriptions found' }, { status: 404 })
    }
    
    // Send push notification to all user's devices
    const notifications = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }
      
      return webpush.sendNotification(
        pushSubscription,
        JSON.stringify({ title, body })
      ).catch(error => {
        console.error('Push notification failed:', error)
        // Remove invalid subscription
        if (error.statusCode === 410) {
          supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
      })
    })
    
    await Promise.all(notifications)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push notification error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}