import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  console.log('DIAGNOSTIC (Supabase Client): Creating new client...');
  const cookieStore = cookies();
  console.log('DIAGNOSTIC (Supabase Client): Cookie store:', {
    hasStore: !!cookieStore,
    storeType: cookieStore?.constructor?.name
  });

  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseKey) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Create a server client configured to use cookies
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          if (!cookie) return undefined;

          // Special handling for PKCE code verifier cookies - strip quotes if present
          if (name.includes('-auth-token-code-verifier')) {
            const value = cookie.value;
            console.log(`DIAGNOSTIC (Supabase Client): Getting PKCE cookie ${name}`, { 
              originalValue: value,
              hasQuotes: value.startsWith('"') && value.endsWith('"')
            });
            if (value.startsWith('"') && value.endsWith('"')) {
              const unquoted = value.slice(1, -1);
              console.log(`DIAGNOSTIC (Supabase Client): Unquoted PKCE cookie value from "${value.substring(0, 10)}..." to "${unquoted.substring(0, 10)}..."`);
              return unquoted;
            }
          }
          
          return cookie.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`DIAGNOSTIC (Supabase Client): Setting cookie ${name}`, { 
            valueLength: value.length,
            options 
          });
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('DIAGNOSTIC (Supabase Client): Error setting cookie:', error);
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          console.log(`DIAGNOSTIC (Supabase Client): Removing cookie ${name}`, { options });
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.error('DIAGNOSTIC (Supabase Client): Error removing cookie:', error);
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
} 