import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthCodeError({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const message = searchParams.message || "Unknown authentication error";
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-lg bg-white/5 border border-white/10">
        <h1 className="text-2xl font-bold text-[#f9b507] mb-4">Authentication Error</h1>
        
        <div className="bg-red-900/20 border border-red-800/50 rounded p-4 mb-6">
          <p className="text-sm font-mono break-words">{message}</p>
        </div>
        
        <p className="text-white/70 mb-6">
          There was a problem authenticating with Slack. This could be due to an expired session 
          or a configuration issue.
        </p>
        
        <div className="flex justify-between">
          <Button
            asChild
            variant="outline"
            className="bg-transparent border-[#f9b507] text-[#f9b507] hover:bg-[#f9b507]/10"
          >
            <Link href="/">
              Return to Home
            </Link>
          </Button>
          
          <Button
            asChild
            variant="outline"
            className="bg-[#f9b507] border-[#f9b507] text-black hover:bg-[#f9b507]/90"
          >
            <Link href="/?retry=true">
              Try Again
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 