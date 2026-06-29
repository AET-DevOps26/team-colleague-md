-- Seed sample activity for a couple of topics so the Topic cards show real "posts this week"
-- figures instead of a uniform 0. Two layers, because posts_this_week is NOT real-time — it is
-- only refreshed by the daily TopicStatsJob (refreshRollingCounts):
--   1. real posts (+ post_topics links) dated inside the rolling windows, so the overnight
--      recompute keeps these counts non-zero rather than resetting them to 0;
--   2. an immediate UPDATE of the stored stat columns, so the cards read correctly before the
--      first recompute runs. is_hot/activity_score here are display seeds — the cron may later
--      normalise them against live post counts (accepted).
-- Cross-service: author_id is a free-standing UUID (no FK to user-service).

-- 1. Large Language Models — 6 posts this week, 2 last week.
INSERT INTO posts (id, author_id, title, content, status, type, created_at, updated_at)
SELECT gen_random_uuid(),
       'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
       'Sample LLM post #' || g,
       'Seed content for topic-activity demo.',
       'PUBLISHED', 'NORMAL',
       now() - (g || ' days')::interval,
       now() - (g || ' days')::interval
FROM generate_series(1, 6) g           -- 1..6 days ago → inside the current 7-day window
UNION ALL
SELECT gen_random_uuid(),
       'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
       'Sample LLM post #' || g,
       'Seed content for topic-activity demo.',
       'PUBLISHED', 'NORMAL',
       now() - (g || ' days')::interval,
       now() - (g || ' days')::interval
FROM generate_series(8, 9) g;          -- 8..9 days ago → inside the previous-week window

INSERT INTO post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM posts p
CROSS JOIN topics t
WHERE p.title LIKE 'Sample LLM post #%'
  AND t.name = 'large-language-models';

-- 2. AI Agents — 3 posts this week, 1 last week.
INSERT INTO posts (id, author_id, title, content, status, type, created_at, updated_at)
SELECT gen_random_uuid(),
       'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
       'Sample Agents post #' || g,
       'Seed content for topic-activity demo.',
       'PUBLISHED', 'NORMAL',
       now() - (g || ' days')::interval,
       now() - (g || ' days')::interval
FROM generate_series(1, 3) g
UNION ALL
SELECT gen_random_uuid(),
       'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
       'Sample Agents post #' || g,
       'Seed content for topic-activity demo.',
       'PUBLISHED', 'NORMAL',
       now() - (g || ' days')::interval,
       now() - (g || ' days')::interval
FROM generate_series(8, 8) g;

INSERT INTO post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM posts p
CROSS JOIN topics t
WHERE p.title LIKE 'Sample Agents post #%'
  AND t.name = 'ai-agents';

-- 3. Immediate stat-column seed so the cards read correctly before the first overnight recompute.
UPDATE topics
SET posts_this_week  = 6,
    posts_prev_week  = 2,
    activity_score   = 1.000,
    is_hot           = true,
    follower_count   = 4210,
    total_post_count = total_post_count + 8
WHERE name = 'large-language-models';

UPDATE topics
SET posts_this_week  = 3,
    posts_prev_week  = 1,
    activity_score   = 0.500,
    is_hot           = false,
    follower_count   = 2870,
    total_post_count = total_post_count + 4
WHERE name = 'ai-agents';
