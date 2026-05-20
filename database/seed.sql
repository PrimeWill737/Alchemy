-- Optional seed: default organization for local / first deploy.
-- Run after schema.sql: psql "$DATABASE_URL" -f database/seed.sql

INSERT INTO organizations (name, slug)
VALUES ('Default Organization', 'default')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (
  organization_id, name, email, password_hash, role, company_role_preset,
  permission_level, display_currency, company_name, role_title, package_tier, package_currency, package_amount
)
SELECT
  id,
  'William Bosworth',
  'williambosworth420@gmail.com',
  crypt('Willy0@gmail.com', gen_salt('bf')),
  'super_admin'::user_role,
  'super_admin',
  'full',
  'NGN',
  'Alchemy',
  'Super Admin',
  'Enterprise',
  'NGN',
  0
FROM organizations
WHERE slug = 'default'
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  company_role_preset = EXCLUDED.company_role_preset,
  permission_level = EXCLUDED.permission_level,
  display_currency = EXCLUDED.display_currency;

INSERT INTO lead_sources (organization_id, name, sort_order)
SELECT o.id, v.name, v.ord
FROM organizations o
CROSS JOIN (
  VALUES ('Website', 1), ('Referral', 2), ('LinkedIn', 3)
) AS v(name, ord)
WHERE o.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM lead_sources ls WHERE ls.organization_id = o.id AND ls.name = v.name
  );

-- Sample CRM records (skipped when rows already exist for the default org)
INSERT INTO customers (organization_id, name, email, phone, company, assigned_to, created_by)
SELECT o.id, 'Jordan Mills', 'jordan@northstar.com', '+1-202-555-0101', 'Northstar Inc', u.id, u.id
FROM organizations o
JOIN users u ON u.organization_id = o.id AND u.email = 'williambosworth420@gmail.com'
WHERE o.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM customers c WHERE c.organization_id = o.id AND c.email = 'jordan@northstar.com'
  );

INSERT INTO leads (organization_id, name, source, status, value, assigned_to, created_by)
SELECT o.id, v.name, v.source, v.status::lead_status, v.value, u.id, u.id
FROM organizations o
JOIN users u ON u.organization_id = o.id AND u.email = 'williambosworth420@gmail.com'
CROSS JOIN (
  VALUES
    ('Nova Logistics', 'Website', 'qualified', 12000),
    ('Peak Retail', 'Referral', 'new', 38000)
) AS v(name, source, status, value)
WHERE o.slug = 'default'
  AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.organization_id = o.id AND l.name = v.name);

INSERT INTO deals (organization_id, title, customer_id, value, stage, close_date, assigned_to, created_by)
SELECT o.id, 'Northstar Expansion', c.id, 74000, 'negotiation'::deal_stage, '2026-06-04'::date, u.id, u.id
FROM organizations o
JOIN users u ON u.organization_id = o.id AND u.email = 'williambosworth420@gmail.com'
LEFT JOIN customers c ON c.organization_id = o.id AND c.company = 'Northstar Inc'
WHERE o.slug = 'default'
  AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.organization_id = o.id AND d.title = 'Northstar Expansion');

INSERT INTO tasks (organization_id, title, due_date, assignee_id, status, priority, created_by)
SELECT o.id, v.title, v.due_date::date, u.id, v.status::task_status, v.priority::task_priority, u.id
FROM organizations o
JOIN users u ON u.organization_id = o.id AND u.email = 'williambosworth420@gmail.com'
CROSS JOIN (
  VALUES
    ('Follow up Nova Logistics', CURRENT_DATE + 2, 'in_progress', 'high'),
    ('Prepare monthly pipeline report', CURRENT_DATE + 7, 'todo', 'medium')
) AS v(title, due_date, status, priority)
WHERE o.slug = 'default'
  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.organization_id = o.id AND t.title = v.title);

INSERT INTO messages (organization_id, channel, sender, content, status)
SELECT o.id, v.channel, v.sender, v.content, 'open'
FROM organizations o
CROSS JOIN (
  VALUES
    ('Email', 'support@crm.dev', 'Question about enterprise onboarding timeline.'),
    ('SMS', '+1-202-555-0148', 'Can we reschedule the demo to Thursday?'),
    ('WhatsApp', '+234 803 555 0199', 'Sent the signed proposal — please confirm receipt.')
) AS v(channel, sender, content)
WHERE o.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.organization_id = o.id AND m.sender = v.sender
  );

INSERT INTO activities (organization_id, type, description, user_id)
SELECT o.id, v.type, v.description, u.id
FROM organizations o
JOIN users u ON u.organization_id = o.id AND u.email = 'williambosworth420@gmail.com'
CROSS JOIN (
  VALUES
    ('call', 'Discovery call with Nova Logistics procurement lead.'),
    ('email', 'Sent proposal deck to Peak Retail stakeholders.')
) AS v(type, description)
WHERE o.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM activities a WHERE a.organization_id = o.id AND a.description = v.description
  );

-- Set CRM_DEFAULT_ORGANIZATION_ID in .env to this org’s UUID after first insert, or query:
-- SELECT id FROM organizations WHERE slug = 'default';
