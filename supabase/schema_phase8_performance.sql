-- Phase 8: performance and filtering indexes for dashboard and buyer portal flows

create index if not exists idx_site_layouts_is_published
  on site_layouts(is_published);

create index if not exists idx_agents_is_active
  on agents(is_active);

create index if not exists idx_enquiries_agent_id
  on enquiries(agent_id);

create index if not exists idx_enquiries_lead_status_created_at
  on enquiries(lead_status, created_at desc);

create index if not exists idx_visit_schedules_layout_id_scheduled_at
  on visit_schedules(layout_id, scheduled_at desc);

create index if not exists idx_visit_schedules_agent_id
  on visit_schedules(agent_id);

create index if not exists idx_visit_schedules_status_scheduled_at
  on visit_schedules(status, scheduled_at desc);

create index if not exists idx_payment_installments_plan_id
  on payment_installments(plan_id);

create index if not exists idx_payment_installments_status_due_date
  on payment_installments(status, due_date);

create index if not exists idx_documents_layout_id_created_at
  on documents(layout_id, created_at desc);

create index if not exists idx_documents_plot_id_visible_created_at
  on documents(plot_id, is_buyer_visible, created_at desc);

create index if not exists idx_agent_layout_assignments_layout_id
  on agent_layout_assignments(layout_id);

create index if not exists idx_agent_presence_logs_agent_id_logged_at
  on agent_presence_logs(agent_id, logged_at desc);

create index if not exists idx_agent_presence_logs_layout_id_logged_at
  on agent_presence_logs(layout_id, logged_at desc);
