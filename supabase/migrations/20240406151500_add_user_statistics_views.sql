-- Add user statistics views for Hall of Shame tooltip enhancements

-- Create a view for user jargon counts
CREATE OR REPLACE VIEW user_jargon_counts AS
SELECT 
    charged_user_id,
    COUNT(*) as jargon_count
FROM 
    charges
GROUP BY 
    charged_user_id;

-- Create a view for user favorite jargon terms
CREATE OR REPLACE VIEW user_favorite_jargon AS
WITH jargon_usage_counts AS (
    SELECT 
        charged_user_id,
        jargon_term_id,
        COUNT(*) as term_count,
        ROW_NUMBER() OVER (PARTITION BY charged_user_id ORDER BY COUNT(*) DESC) as rank
    FROM 
        charges
    GROUP BY 
        charged_user_id, jargon_term_id
)
SELECT 
    c.charged_user_id,
    j.term as favorite_phrase,
    c.term_count
FROM 
    jargon_usage_counts c
JOIN 
    jargon_terms j ON c.jargon_term_id = j.id
WHERE 
    c.rank = 1; 