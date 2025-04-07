-- Create function to get top jargon users
CREATE OR REPLACE FUNCTION get_top_jargon_users(workspace_id_param UUID)
RETURNS TABLE (
    charged_user_id UUID,
    users jsonb,
    total_charges decimal,
    jargon_count bigint,
    favorite_phrase text
) AS $$
BEGIN
    RETURN QUERY
    WITH user_totals AS (
        SELECT 
            c.charged_user_id,
            u.display_name,
            u.avatar_url,
            SUM(c.amount) as total_amount,
            COUNT(*) as times_charged
        FROM charges c
        JOIN users u ON c.charged_user_id = u.id
        WHERE c.workspace_id = workspace_id_param
        GROUP BY c.charged_user_id, u.display_name, u.avatar_url
    ),
    favorite_terms AS (
        SELECT 
            c.charged_user_id,
            jt.term as favorite_phrase
        FROM charges c
        JOIN jargon_terms jt ON c.jargon_term_id = jt.id
        WHERE c.workspace_id = workspace_id_param
        GROUP BY c.charged_user_id, jt.term
        HAVING COUNT(*) = (
            SELECT COUNT(*)
            FROM charges c2
            JOIN jargon_terms jt2 ON c2.jargon_term_id = jt2.id
            WHERE c2.charged_user_id = c.charged_user_id
            GROUP BY c2.jargon_term_id
            ORDER BY COUNT(*) DESC
            LIMIT 1
        )
    )
    SELECT 
        ut.charged_user_id,
        jsonb_build_array(
            jsonb_build_object(
                'display_name', ut.display_name,
                'avatar_url', ut.avatar_url
            )
        ) as users,
        ut.total_amount as total_charges,
        ut.times_charged as jargon_count,
        COALESCE(ft.favorite_phrase, 'None yet') as favorite_phrase
    FROM user_totals ut
    LEFT JOIN favorite_terms ft ON ut.charged_user_id = ft.charged_user_id
    ORDER BY ut.total_amount DESC;
END;
$$ LANGUAGE plpgsql; 