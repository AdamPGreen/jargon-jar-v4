import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/server';

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const installRequired = searchParams.install_required === "true";
  const workspaceHint = searchParams.workspace_hint as string | undefined;
  
  // Get Supabase auth URL
  const supabase = createClient();
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'slack',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    }
  });
  
  // Handle potential null value for URL
  const signInUrl = data.url || '/auth/callback';

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f9b507_1px,transparent_1px),linear-gradient(to_bottom,#f9b507_1px,transparent_1px)] bg-[size:8rem_8rem] opacity-[0.03]" />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black to-black" />
      </div>

      {/* Main Content */}
      <div className="relative min-h-screen flex flex-col">
        {/* Top Bar */}
        <div className="w-full border-b border-white/5 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span className="font-mono text-sm text-white/60">Jargon Jar</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Title */}
            <div className="relative mb-8">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-none mb-4">
                JARGON
                <br />
                <span className="text-[#f9b507]">JAR</span>
              </h1>
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#f9b507] rounded-full opacity-10 blur-3xl" />
            </div>

            {/* Tagline */}
            <p className="text-xl md:text-2xl mb-12 font-mono text-white/80">
              Tax your team's corporate jargon
            </p>

            {/* Installation Message */}
            {installRequired && (
              <div className="bg-[#f9b507]/10 border border-[#f9b507]/20 rounded-lg p-6 mb-8">
                <p className="text-lg font-medium mb-2 text-[#f9b507]">Installation Required</p>
                <p className="text-white/70">
                  {workspaceHint 
                    ? `The app needs to be installed in your workspace (${workspaceHint}) first.`
                    : "The app needs to be installed in your workspace first."}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-16">
              {/* Add to Slack Button */}
              <a
                href="https://slack.com/oauth/v2/authorize?client_id=7831214798177.8652143181591&scope=app_mentions:read,channels:history,chat:write,commands,groups:history,im:write,users:read,users:read.email,team:read&user_scope=identity.basic,identity.avatar,identity.email,identity.team"
              >
                <img
                  alt="Add to Slack"
                  height="40"
                  width="139"
                  src="https://platform.slack-edge.com/img/add_to_slack.png"
                  srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
                  className="transform hover:scale-105 transition-transform"
                />
              </a>

              {/* Sign In Button */}
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-[#f9b507] text-[#f9b507] hover:bg-[#f9b507]/10 rounded-lg px-6"
              >
                <a href={signInUrl}>
                  Sign in with Slack
                </a>
              </Button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-6 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors">
                <h3 className="text-[#f9b507] font-medium text-lg mb-2">Charge</h3>
                <p className="text-white/70 text-sm">
                  Tax your team's corporate jargon with the /charge command
                </p>
              </div>
              <div className="p-6 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors">
                <h3 className="text-[#f9b507] font-medium text-lg mb-2">Track</h3>
                <p className="text-white/70 text-sm">
                  Monitor jargon usage and collect fines in your workspace
                </p>
              </div>
              <div className="p-6 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors">
                <h3 className="text-[#f9b507] font-medium text-lg mb-2">Leaderboard</h3>
                <p className="text-white/70 text-sm">
                  See who's the biggest corporate jargon offender
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="w-full border-t border-white/5 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span className="text-white/40 text-sm">© {new Date().getFullYear()} Jargon Jar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
