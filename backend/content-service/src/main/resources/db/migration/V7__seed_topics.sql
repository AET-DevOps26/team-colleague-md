INSERT INTO topic_categories (id, label, sort_order) VALUES
    ('research',     'Research & Papers',              1),
    ('models',       'Models & Training',              2),
    ('applications', 'Applications & Products',        3),
    ('engineering',  'Engineering & Infrastructure',   4);

INSERT INTO topics (id, name, display_name, category_id, sort_order, created_at, updated_at) VALUES
    -- research
    (gen_random_uuid(), 'transformers',           'Transformers',               'research',     1, NOW(), NOW()),
    (gen_random_uuid(), 'reinforcement-learning', 'Reinforcement Learning',     'research',     2, NOW(), NOW()),
    (gen_random_uuid(), 'computer-vision',        'Computer Vision',            'research',     3, NOW(), NOW()),
    (gen_random_uuid(), 'nlp',                    'Natural Language Processing','research',     4, NOW(), NOW()),
    (gen_random_uuid(), 'multimodal-ai',          'Multimodal AI',              'research',     5, NOW(), NOW()),
    -- models
    (gen_random_uuid(), 'large-language-models',  'Large Language Models',      'models',       1, NOW(), NOW()),
    (gen_random_uuid(), 'diffusion-models',       'Diffusion Models',           'models',       2, NOW(), NOW()),
    (gen_random_uuid(), 'fine-tuning',            'Fine-Tuning',                'models',       3, NOW(), NOW()),
    (gen_random_uuid(), 'model-evaluation',       'Model Evaluation',           'models',       4, NOW(), NOW()),
    -- applications
    (gen_random_uuid(), 'ai-assistants',          'AI Assistants',              'applications', 1, NOW(), NOW()),
    (gen_random_uuid(), 'code-generation',        'Code Generation',            'applications', 2, NOW(), NOW()),
    (gen_random_uuid(), 'ai-agents',              'AI Agents',                  'applications', 3, NOW(), NOW()),
    (gen_random_uuid(), 'healthcare-ai',          'Healthcare AI',              'applications', 4, NOW(), NOW()),
    (gen_random_uuid(), 'robotics',               'Robotics',                   'applications', 5, NOW(), NOW()),
    -- engineering
    (gen_random_uuid(), 'mlops',                  'MLOps',                      'engineering',  1, NOW(), NOW()),
    (gen_random_uuid(), 'inference-optimization', 'Inference Optimization',     'engineering',  2, NOW(), NOW()),
    (gen_random_uuid(), 'distributed-training',   'Distributed Training',       'engineering',  3, NOW(), NOW()),
    (gen_random_uuid(), 'ai-hardware',            'AI Hardware',                'engineering',  4, NOW(), NOW());
