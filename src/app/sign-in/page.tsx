'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Button } from "@/components/ui/button"
import { useState } from 'react'
import Image from 'next/image'

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
  
  // Get URL parameters (for any error messages from callbacks)
  const urlParams = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search) 
    : new URLSearchParams()
  const urlError = urlParams.get('error')
  
  async function signInWithSlack() {
    try {
      setIsLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'slack',
        options: {
          redirectTo: `${window.location.origin}/api/auth/slack/callback`,
          scopes: 'openid email profile',
        },
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Slack:', error)
      setError('Failed to sign in with Slack. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Jargon Jar</h1>
          <p className="mt-2 text-slate-400">Fight corporate jargon, one buzzword at a time</p>
        </div>
        
        {(error || urlError) && (
          <div className="p-3 mb-4 text-sm bg-red-900/50 border border-red-500 rounded-md">
            {error || urlError}
          </div>
        )}
        
        <div className="space-y-4">
          <Button
            onClick={signInWithSlack}
            disabled={isLoading}
            className="w-full py-6 bg-[#4A154B] hover:bg-[#3e1240] text-white flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-slate-200 border-t-transparent rounded-full mr-2" />
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 122.8 122.8" 
                fill="#FFFFFF" 
                className="mr-2"
                aria-labelledby="slackLogo"
              >
                <title id="slackLogo">Slack Logo</title>
                <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"/>
                <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"/>
                <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"/>
                <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"/>
              </svg>
            )}
            <span>{isLoading ? 'Signing in...' : 'Sign in with Slack'}</span>
          </Button>
          
          <p className="text-center text-slate-400 text-sm mt-4">
            You need to be part of a Slack workspace that has Jargon Jar installed
          </p>
        </div>
      </div>
    </div>
  )
} 