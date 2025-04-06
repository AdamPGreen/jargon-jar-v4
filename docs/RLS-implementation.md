# Implementing Proper RLS Policies for Jargon Jar

## Current State Assessment

Your application has several tables that need proper RLS:
- `users` - User profiles
- `workspaces` - Slack workspace data
- `charges` - Jargon charges between users

Currently, you're bypassing RLS with the admin client, which works but isn't ideal for security.

## RLS Implementation Plan

### 1. Enable RLS on All Tables

First, enable RLS on all tables and ensure they're completely locked down by default:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE jargon ENABLE ROW LEVEL SECURITY; -- Assuming this exists
```

### 2. Create an App-specific Auth Function

Create a function to get the current authenticated user's information:

```sql
-- Create function to get the current user's Slack ID from auth.uid
CREATE OR REPLACE FUNCTION public.get_auth_slack_user_id()
RETURNS TEXT AS $$
DECLARE
  slack_user_id TEXT;
BEGIN
  SELECT id INTO slack_user_id
  FROM auth.identities
  WHERE user_id = auth.uid() AND provider = 'slack_oidc';
  
  RETURN slack_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Create an App-specific User Workspace Function

```sql
-- Create function to get current user's workspace_id 
CREATE OR REPLACE FUNCTION public.get_auth_user_workspace_id()
RETURNS UUID AS $$
DECLARE
  workspace_id UUID;
BEGIN
  SELECT u.workspace_id INTO workspace_id
  FROM users u
  JOIN auth.identities i ON u.slack_id = i.id
  WHERE i.user_id = auth.uid() AND i.provider = 'slack_oidc';
  
  RETURN workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Implement Table-Specific Policies

#### Users Table Policies

```sql
-- Users in the same workspace can see each other
CREATE POLICY "Users can view other users in same workspace"
ON users
FOR SELECT
USING (
  workspace_id = public.get_auth_user_workspace_id()
);

-- Users can update their own record
CREATE POLICY "Users can update their own record"
ON users
FOR UPDATE
USING (
  slack_id = public.get_auth_slack_user_id()
);

-- Service role can manage all user records
CREATE POLICY "Service role can manage all users"
ON users
USING (
  auth.role() = 'service_role'
);
```

#### Workspaces Table Policies

```sql
-- Users can view their own workspace
CREATE POLICY "Users can view own workspace"
ON workspaces
FOR SELECT
USING (
  id = public.get_auth_user_workspace_id()
);

-- Service role can manage all workspaces
CREATE POLICY "Service role can manage all workspaces"
ON workspaces
USING (
  auth.role() = 'service_role'
);
```

#### Charges Table Policies

```sql
-- Users can view charges in their workspace
CREATE POLICY "Users can view charges in their workspace"
ON charges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE (u.id = charges.charged_user_id OR u.id = charges.charging_user_id)
    AND u.workspace_id = public.get_auth_user_workspace_id()
  )
);

-- Users can create charges for users in their workspace
CREATE POLICY "Users can create charges in their workspace"
ON charges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = charges.charged_user_id
    AND u.workspace_id = public.get_auth_user_workspace_id()
  )
  AND
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.slack_id = public.get_auth_slack_user_id()
    AND u.id = charges.charging_user_id
  )
);

-- Service role can manage all charges
CREATE POLICY "Service role can manage all charges"
ON charges
USING (
  auth.role() = 'service_role'
);
```

### 5. Code Changes Required

1. Update database utility functions:

```typescript
// Create a file: src/lib/db-helpers.ts
export function getSafeClient() {
  // Regular client for RLS-protected operations
  return createClient();
}

export function getAdminClient() {
  // Admin client only for operations that need elevated permissions
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

2. Update layout.tsx and dashboard pages to use the regular client:

```typescript
// In layout.tsx and dashboard/page.tsx
import { getSafeClient } from '@/lib/db-helpers';

// Replace all supabaseAdmin queries with the regular client
const supabase = getSafeClient();
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('id, display_name, avatar_url, workspace_id')
  .eq('slack_id', slackUserId)
  .single();
```

3. Only use admin client for operations that require bypassing RLS:

```typescript
// In installation/admin pages
import { getAdminClient } from '@/lib/db-helpers';

// For example: Creating new users during onboarding
const supabaseAdmin = getAdminClient();
await supabaseAdmin.from('users').insert({...});
```

### 6. Testing Plan

1. Test authenticated user access:
   - Users should be able to view/update their own profile
   - Users should see other users from their workspace
   - Users should only see charges related to their workspace

2. Test cross-workspace isolation:
   - Users from workspace A shouldn't see users/charges from workspace B

3. Test anonymous access:
   - Unauthenticated requests should be rejected

### 7. Deployment Strategy

1. Apply database changes first:
   - Enable RLS on all tables
   - Create helper functions
   - Apply policies

2. Deploy code changes:
   - Update client usage in application code
   - Switch to safe client for regular operations
   - Keep admin client for special operations

3. Monitor application logs:
   - Watch for permission errors
   - Ensure queries are working as expected

This complete RLS implementation will provide proper security boundaries while maintaining all current functionality. It eliminates the need for the admin client in most places while ensuring data remains properly isolated between workspaces. 