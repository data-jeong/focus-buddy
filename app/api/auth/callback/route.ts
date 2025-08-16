import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Check if user signed in with Google
      const provider = data.session.user.app_metadata.provider
      
      if (provider === 'google') {
        // Get Google access token from session
        const providerToken = data.session.provider_token
        const providerRefreshToken = data.session.provider_refresh_token
        
        if (providerRefreshToken) {
          // Save Google refresh token to user settings for Calendar access
          await supabase
            .from('user_settings')
            .upsert({
              user_id: data.session.user.id,
              google_calendar_connected: true,
              google_refresh_token: providerRefreshToken,
            }, {
              onConflict: 'user_id'
            })
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/dashboard`)
}