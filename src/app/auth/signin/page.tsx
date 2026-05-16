'use client'

import { Button } from '@/components/ui/button'

export default function SignIn() {
  const handleSlackSignIn = () => {
    window.location.href = '/api/auth/signin'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-4">Sign In to Jargon Jar</h1>
      <Button 
        onClick={handleSlackSignIn}
        size="lg"
        className="bg-[#FF5500] hover:bg-[#FF5500]/90 text-white text-base font-bold h-12 px-8"
      >
        Sign In with Slack
      </Button>
    </div>
  )
} 