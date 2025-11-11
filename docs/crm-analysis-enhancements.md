# CRM Tool – Enhancement & Backend Requirements Report

## 1. Executive Summary
- Consolidates identified gaps in the initial analysis document.
- Prioritises enhancements that improve user experience, operational efficiency, data integrity, and security.
- Details backend capabilities, data structures, and integration touchpoints required to support the refined scope.

## 2. Lead Management Enhancements
### 2.1 Data Model & Tracking
- Add unique lead identifier, acquisition timestamp (UTC), and audit timestamps (`created_at`, `updated_at`).
- Track original source metadata (campaign, ad set, creative, form ID) and consent flags to meet marketing compliance.
- Persist lead status history and user assignments for auditability.

### 2.2 Lead Lifecycle Automation
- SLA automation engine with configurable reminders (per status) and escalation routing.
- Auto-reassignment workflows for `Yanlış Numara` and `Block` statuses with admin queue visibility.
- Cooling-off logic that prevents leads from returning to the same agent for configurable period after certain outcomes.

### 2.3 Communication Logging
- Unified activity timeline capturing channel, timestamp, notes, and attachments.
- Template management for WhatsApp, email, SMS with personalisation variables.
- Built-in dialer/WhatsApp bridge that masks numbers and records call outcome duration (requires telephony provider integration).

### 2.4 Privacy & Security
- Field-level masking for phone numbers with role-based reveal (admin only) and secure proxy call/WhatsApp initiation.
- Consent verification logs and unsubscribe tracking synced with marketing platforms.
- PII encryption at rest and retention policies with automated purging.

### 2.5 UX Considerations
- Responsive table with sticky headers, column visibility controls, and inline filters.
- Bulk actions (status update, assignment) respecting permissions.
- Contextual status update modal that surfaces SLA timers, previous actions, and recommended next steps.
- Empty states and loading skeletons for clarity.

### 2.6 Secure Communication UX (Implemented)
- Contact columns mask phone numbers entirely while still indicating availability of call/WhatsApp channels.
- Phone and WhatsApp actions open in-product modals instead of external apps, guiding agents through proxy-based calling and messaging.
- WhatsApp composer provides inline text area, validation, and delivery feedback without exposing the phone number or leaving the CRM.
- Call modal surfaces secure session metadata (session ID, status, expiry) so agents can confirm bridge activation without raw PII.
- Success and error states feed both toast notifications and contextual messages inside the modal to keep users informed.

## 3. User & Role Management Enhancements
### 3.1 Role-Based Access Control (RBAC)
- Expand roles: Admin, Sales Manager (reports/assignments), Sales Agent, Compliance Auditor.
- Granular permissions for viewing/editing leads, exporting data, managing templates, viewing phone numbers.

### 3.2 Team & Territory Structure
- Support agent grouping (teams/regions) for reporting and assignment logic.
- Configure working hours and capacity per user to balance distribution.

### 3.3 Audit & Compliance
- Immutable audit logs for user authentication, assignment changes, status updates, and data exports.
- Session timeout, MFA enforcement, and IP allow-listing for admin roles.

## 4. Distribution Engine Improvements
- Extend rule engine to support cascading rules (campaign > ad set > keyword > geography).
- Weighted round robin with real-time capacity checks and pause overrides for out-of-office users.
- A/B testing capability to split traffic between scripts or teams, capturing conversion outcomes.

## 5. Reporting & Analytics Expansion
### 5.1 Dashboards
- Multi-level dashboards (company, campaign, agent) with drill-down to individual lead timelines.
- SLA compliance widgets highlighting overdue follow-ups.

### 5.2 Metrics & KPIs
- Lead response time, contact rate, conversion velocity, revenue per lead, churn reasons.
- Funnel visualisations: lead → contacted → qualified → proposal → sale.

### 5.3 Data Export & BI Integration
- Scheduled exports (CSV/Excel) with filters and role-based access.
- BI connector/API endpoint to sync aggregated metrics to external analytics tools.

## 6. Backend Requirements
### 6.1 Services & APIs
- Lead ingestion microservice with connectors for Facebook Graph API, Google Ads API, and manual CSV upload.
- Distribution service processing assignment rules, capacity checks, and SLA timers (cron/queue worker).
- Communication service interfacing with telephony/WhatsApp/email providers via webhooks.
- Secure contact orchestrator issuing proxy call sessions and first-party WhatsApp sends, aligned with new frontend modals.
- Reporting service aggregating metrics, caching dashboards, and exposing REST/GraphQL endpoints.

### 6.2 Data Storage
- Relational database (PostgreSQL) with tables for leads, statuses, assignments, activities, campaigns, users, roles, SLA rules, communication templates, and audit logs.
- Message queue (e.g., RabbitMQ, Kafka) for asynchronous lead ingestion and reminder notifications.
- Object storage (S3-compatible) for attachments and operational images.

### 6.3 Integrations & Webhooks
- OAuth token refresh workers for ad platforms.
- Webhooks for inbound communications (WhatsApp replies, call events) updating lead activity timeline.
- CRM-to-ERP integration hooks when sales are completed (operation details).

### 6.4 Performance & Reliability
- Batch import endpoints with idempotency keys to prevent duplicate leads.
- Pagination, cursor-based APIs for 10k+ records; caching for frequently accessed filters.
- Automated retries with exponential backoff for third-party API failures and alerting via observability stack.

### 6.5 Security & Compliance
- JWT-based auth with refresh tokens, role scopes, and device binding.
- Encryption (AES-256) for PII fields, TLS for in-transit data, OWASP hardened endpoints.
- GDPR/KVKK compliance: consent storage, right-to-erasure workflows, data retention scheduler.

### 6.6 Secure Communication Services (New UI Requirements)
- REST endpoints powering the new modals:
  - `POST /leads/{id}/call` → returns `{ callId, status, expiresAt?, dialUrl? }` for proxy dialer orchestration.
  - `POST /leads/{id}/whatsapp` → returns `{ messageId, status, deliveredAt? }` after pushing messages through WhatsApp Business API.
- Responses must avoid exposing raw phone numbers; provide only session/token data consumed by the UI.
- Persist every request/response pair in activity logs for auditing, including failure reasons and provider references.
- Implement throttling, retry logic, and timeout guards to surface actionable error messages back to the modal.
- Provide webhooks or polling hooks to update delivery/connection status, feeding the toast + inline success states.

## 7. UX Deliverables
- User journey maps for admin and sales personas.
- Low-fidelity wireframes for lead list, lead detail, communication modal, reporting dashboards.
- Accessibility checklist (WCAG 2.1 AA) covering keyboard navigation, contrast ratios, and screen reader labels.

## 8. Implementation Roadmap (High-Level)
1. **Foundation**: establish RBAC, data model, lead ingestion pipeline.
2. **Automation**: implement distribution engine, SLA workflows, communication logging.
3. **Experience**: deliver enhanced UI components, templates, and mask/telephony integrations.
4. **Analytics**: build dashboards, exports, BI connectors.
5. **Compliance**: finalize audit logging, retention, encryption, and consent mechanisms.

## 9. Risks & Mitigations
- **API Limits**: cache tokens, schedule pulls respecting rate limits, use webhooks when available.
- **Data Quality**: deduplication logic, validation on import, manual review queue.
- **Adoption**: phased rollout with training, in-app guidance, and feedback loop.

## 10. Next Steps
- Validate scope with stakeholders, prioritise MVP vs. future phases.
- Align with backend team on service architecture and timelines.
- Begin UI/UX prototyping sessions before development sprint planning.

## 11. Backend Follow-Up Checklist (Secure Communication UI)
- Finalise provider selection (Twilio, Meta Cloud API, etc.) and ensure SDK supports proxy calling + templated messaging.
- Map UI events to audit schema (`PHONE`, `WHATSAPP`) so new actions persist consistently with existing activity logs.
- Define failure taxonomy (rate limit, invalid template, unreachable contact) to populate modal error states.
- Extend notification workers to reconcile delivery receipts and update `callSession.status` / `whatsAppResult.status` asynchronously.
- Provide end-to-end integration tests covering masked number flows to satisfy KVKK/GDPR audit requirements.

