import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Define the redirect URL based on the environment
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? 'https://jargon-jar-v4.vercel.app/auth/callback' // Production callback
      : 'http://localhost:3000/auth/callback'; // Local development callback

    // Get the Slack Sign-In URL from Supabase
    const supabase = createClient();
    console.log('DIAGNOSTIC (Auth Request): Starting OAuth sign-in process...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'slack_oidc',
      options: {
        redirectTo: redirectUrl,
      }
    });

    // Log the response data
    console.log('DIAGNOSTIC (Auth Request): OAuth sign-in response:', {
      hasUrl: !!data?.url,
      urlLength: data?.url?.length,
      error: error?.message
    });

    if (error) {
      console.error("Error getting Slack sign-in URL:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.url) {
      console.error("No URL returned from sign-in process");
      return NextResponse.json({ error: "Failed to generate sign-in URL" }, { status: 500 });
    }

    // Redirect to the Supabase OAuth URL
    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error("Unexpected error during sign-in:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 