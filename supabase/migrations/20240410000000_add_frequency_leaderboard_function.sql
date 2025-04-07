-- Create function to get top users by frequency (count of charges)
CREATE OR REPLACE FUNCTION get_top_users_by_frequency(
  workspace_id_param UUID,
  time_period text,
  limit_param integer
)
RETURNS TABLE (
  user_id UUID,
  name text,
  image_url text,
  total_amount numeric,
  charge_count bigint
)
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  -- Set the start date based on time_period
  IF time_period = 'week' THEN
    start_date := NOW() - INTERVAL '1 week';
  ELSIF time_period = 'month' THEN
    start_date := NOW() - INTERVAL '1 month';
  ELSE
    start_date := NULL; -- All time
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.display_name as name,
    u.avatar_url as image_url,
    COALESCE(SUM(c.amount), 0) as total_amount,
    COUNT(c.id) as charge_count
  FROM 
    users u
  LEFT JOIN 
    charges c ON u.id = c.charged_user_id
  WHERE
    u.workspace_id = workspace_id_param
    AND (start_date IS NULL OR c.created_at >= start_date)
    AND (c.workspace_id = workspace_id_param OR c.id IS NULL)
  GROUP BY 
    u.id, u.display_name, u.avatar_url
  ORDER BY 
    charge_count DESC -- Order by frequency (count) rather than amount
  LIMIT 
    limit_param;
END;
$$; 