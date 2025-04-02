import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'node:crypto'

// Verify that the request is coming from Slack
function verifySlackRequest(request: Request, body: string): boolean {
  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')
  
  if (!timestamp || !signature) return false
  
  // Verify timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  const requestTime = Number.parseInt(timestamp, 10)
  if (Math.abs(now - requestTime) > 300) return false
  
  // Verify signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) return false
  
  const mySignature = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')}`
  
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}

export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    
    // Verify the request is from Slack
    if (!verifySlackRequest(request, body)) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 })
    }
    
    // Parse the form data
    const formData = new URLSearchParams(body)
    const command = formData.get('command')
    const text = formData.get('text')
    const userId = formData.get('user_id')
    const channelId = formData.get('channel_id')
    const teamId = formData.get('team_id')
    
    if (command !== '/charge') {
      return NextResponse.json({ error: 'Unknown command' }, { status: 400 })
    }
    
    // Get the Supabase client
    const supabase = createClient()
    
    // For now, return a simple response
    // We'll implement the full charge functionality in the next step
    return NextResponse.json({
      response_type: 'in_channel',
      text: '🎯 *Jargon Jar Charge Initiated*\n\nThis is a placeholder response. The full charge functionality will be implemented in the next step.'
    })
    
  } catch (error) {
    console.error('Error handling Slack command:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 