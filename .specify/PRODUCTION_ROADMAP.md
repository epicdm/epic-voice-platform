# Epic.ai Production Roadmap

**Created**: 2025-10-23
**Status**: Ready to Execute
**Timeline**: 4-6 weeks to production
**Approach**: Phase-by-phase spec-driven development

---

## Overview

This roadmap consolidates all identified gaps into **4 major phases** that can be executed using spec-kit. Each phase is a single large feature specification that encompasses multiple related tasks.

---

## Phase 1: UX Polish & Frontend Integration (Weeks 1-2)

### Objective
Complete all user experience requirements and connect frontend to backend APIs.

### Scope
This phase addresses:
- **UX Implementation Checklist** (currently 40% complete)
- **Backend-Frontend Integration** (currently 60% complete)
- All 10 UX requirements (FR-UX-001 through FR-UX-010)
- Frontend pages using demo data
- Agent builder wizard completion
- Phone provisioning modal testing

### What Gets Built

**UX Components:**
- Loading states with skeleton loaders on all pages
- Error boundaries to catch React crashes gracefully
- Toast notification system using Sonner (already installed)
- Empty state components with friendly messages and CTAs
- Form validation with inline errors using Zod (already installed)
- Retry buttons for failed API calls
- Confirmation dialogs for destructive actions
- Progress indicators for multi-step forms

**Frontend-Backend Integration:**
- Connect agent builder wizard to `/api/user/agents` POST
- Connect phone provisioning modal to `/api/user/phone-numbers/provision`
- Replace hardcoded demo data in dashboard statistics
- Connect analytics page to real call data
- Fix agent list to pull from database
- Connect settings page to user profile API
- Test all forms end-to-end

**Files Affected:**
- `frontend/app/dashboard/agents/new/page.tsx` - Agent wizard
- `frontend/app/phone-numbers/page.tsx` - Phone management
- `frontend/app/dashboard/page.tsx` - Dashboard stats
- `frontend/app/analytics/page.tsx` - Analytics charts
- `frontend/components/` - All UI components
- `frontend/lib/api.ts` - API client improvements

### Success Criteria
- [ ] All 21 pages show loading states during data fetching
- [ ] All forms validate input and show inline errors
- [ ] All user actions show toast notifications
- [ ] All empty states have helpful messages
- [ ] All pages have error boundaries
- [ ] Agent builder wizard successfully creates agents
- [ ] Phone provisioning works end-to-end
- [ ] Dashboard shows real data (no hardcoded values)
- [ ] Zero console errors in browser
- [ ] Lighthouse accessibility score >90

### Spec-Kit Command

```bash
/speckit.specify "PHASE 1: Complete UX polish and frontend-backend integration across all 21 pages of the Epic.ai platform.

SCOPE - UX Polish (per UX_IMPLEMENTATION_CHECKLIST.md):
- Add loading states with skeleton loaders to all data fetching operations (dashboard, agents, calls, phone numbers, analytics)
- Implement error boundaries on all pages to catch and display React errors gracefully
- Integrate toast notifications using Sonner for all user actions (agent creation, phone provisioning, deletion, updates)
- Create empty state components for no agents, no calls, no phone numbers with helpful CTAs
- Add inline form validation using Zod with clear error messages for all forms (agent builder, phone provisioning, settings)
- Add retry buttons for all failed API calls
- Add confirmation dialogs for destructive actions (delete agent, delete phone number, delete user)
- Add progress indicators to agent builder wizard (Step 1 of 3, Step 2 of 3, etc.)
- Add loading spinners to all buttons during async operations
- Add character counts to limited text fields (agent name, description)

SCOPE - Frontend-Backend Integration (per FRONTEND_BACKEND_INTEGRATION.md):
- Connect agent builder wizard (/dashboard/agents/new) to backend API:
  * Step 1: Basic info → validate and store in state
  * Step 2: Instructions and voice → validate and store
  * Step 3: Advanced settings → submit full config to POST /api/user/agents
  * Show success toast and redirect to agents list
  * Handle errors gracefully with retry option
- Connect phone provisioning modal to backend:
  * Call POST /api/user/phone-numbers/provision
  * Show loading state during Magnus Billing API call
  * Display provisioned number with assignment options
  * Handle errors (Magnus unavailable, no numbers available)
- Replace demo data with real API calls:
  * Dashboard stats: GET /api/user/stats
  * Agent list: GET /api/user/agents
  * Call history: GET /api/user/call-logs
  * Phone numbers: GET /api/user/phone-numbers
  * Analytics: GET /api/user/stats/calls and /api/user/stats/cost
- Connect settings page to user profile:
  * Load current user: GET /api/user/profile
  * Update user: PUT /api/user/profile
  * Show success/error feedback
- Test all forms end-to-end with real backend

TECHNICAL REQUIREMENTS:
- Use React Hook Form for all form handling
- Use Zod for all validation schemas
- Use Sonner for toast notifications (already installed)
- Use React Suspense for loading states where appropriate
- Use ErrorBoundary component for error catching
- Ensure all API calls use lib/api.ts helper with auth headers
- Add proper TypeScript types for all API responses
- Handle loading, success, and error states for every API call

TESTING REQUIREMENTS:
- Manually test all 21 pages for loading states
- Test all forms with valid and invalid input
- Test error scenarios (network failure, API errors)
- Test empty states (new user with no agents/calls/phones)
- Test all destructive actions have confirmations
- Test mobile responsiveness (basic - mobile optimization is Phase 2 goal)

SUCCESS CRITERIA:
- Zero hardcoded demo data in frontend
- All user actions show immediate feedback
- No confusing error messages
- Forms validate before submission
- All async operations show loading state
- Lighthouse accessibility score >90
- Zero console errors in browser
"
```

---

## Phase 2: Testing & Quality Assurance (Week 3)

### Objective
Establish automated testing infrastructure with comprehensive coverage.

### Scope
This phase addresses:
- All 8 testing requirements (FR-TEST-001 through FR-TEST-008)
- Backend unit tests (target: 60% coverage)
- Integration tests for external services
- E2E tests for critical user flows
- CI/CD pipeline setup

### What Gets Built

**Backend Testing (pytest):**
- Unit tests for all Flask routes in `user_dashboard.py`
- Unit tests for `backend/agent_creator.py`
- Unit tests for `phone_number_manager.py`
- Integration tests for Magnus Billing client (mocked)
- Integration tests for LiveKit token generation
- Database fixtures for test isolation
- Mock external services (OpenAI, Deepgram, Stripe)

**Frontend Testing (Playwright):**
- E2E test: User signup → agent creation → phone provisioning
- E2E test: Admin user deletion with cascade
- E2E test: Payment flow (trial → subscription)
- E2E test: Agent editing and redeployment
- E2E test: Call history viewing and filtering

**CI/CD Pipeline:**
- GitHub Actions workflow for tests
- Run tests on every commit to feature branches
- Run tests before merge to main
- Fail build if tests don't pass
- Generate coverage reports

**Files Created:**
- `tests/` - New directory structure
- `tests/backend/` - Flask route tests
- `tests/integration/` - External service tests
- `tests/e2e/` - Playwright tests
- `.github/workflows/test.yml` - CI configuration
- `pytest.ini` - Pytest configuration
- `playwright.config.ts` - Playwright configuration

### Success Criteria
- [ ] Backend test coverage ≥60%
- [ ] All API endpoints have tests
- [ ] Magnus Billing integration has mocked tests
- [ ] 5 critical E2E flows have tests
- [ ] Tests run in CI/CD pipeline
- [ ] All tests pass consistently
- [ ] Test database isolated from production
- [ ] External services properly mocked

### Spec-Kit Command

```bash
/speckit.specify "PHASE 2: Establish comprehensive automated testing infrastructure for Epic.ai platform including backend unit tests, integration tests, and E2E tests.

SCOPE - Backend Unit Tests (pytest):
- Create test suite for all Flask routes in user_dashboard.py:
  * Authentication routes (/api/auth/login, /api/auth/logout)
  * Agent CRUD routes (GET/POST/PUT/DELETE /api/user/agents)
  * Phone number routes (/api/user/phone-numbers/*)
  * Call log routes (/api/user/call-logs)
  * Stats routes (/api/user/stats)
  * Admin routes (/api/admin/users)
  * LiveKit routes (/api/livekit/token)
- Create test suite for backend/agent_creator.py:
  * Test agent file generation
  * Test directory structure creation
  * Test template rendering
  * Test configuration validation
- Create test suite for phone_number_manager.py:
  * Test phone provisioning logic
  * Test assignment/unassignment
  * Test pool management
- Target: Minimum 60% code coverage
- Use pytest fixtures for database setup/teardown
- Use test database (SQLite in memory or separate PostgreSQL)
- Mock all external API calls

SCOPE - Integration Tests:
- Magnus Billing integration tests (mocked):
  * Test authentication (HMAC-SHA512)
  * Test DID provisioning
  * Test SIP configuration
  * Test error handling (API down, invalid credentials)
  * Use responses library to mock HTTP calls
- LiveKit integration tests (mocked):
  * Test token generation
  * Test room creation
  * Test agent dispatch
- Stripe integration tests (use Stripe test mode):
  * Test subscription creation
  * Test webhook handling
  * Test payment method update

SCOPE - End-to-End Tests (Playwright):
- E2E Test 1: Complete user journey
  * Sign up with email/password
  * Navigate to agent builder
  * Create agent (3-step wizard)
  * Provision phone number
  * Assign phone to agent
  * View agent in list
  * Expected time: <2 minutes for user
- E2E Test 2: Admin user deletion
  * Login as admin
  * Navigate to admin panel
  * Search for user
  * Delete user with confirmation
  * Verify cascade deletion (agents, calls, phones)
- E2E Test 3: Agent editing
  * Login as user
  * Select existing agent
  * Edit instructions
  * Save changes
  * Verify changes persisted
- E2E Test 4: Call history viewing
  * Login as user with existing calls
  * Navigate to call history
  * Filter by date range
  * Filter by agent
  * Verify data displayed correctly
- E2E Test 5: Error handling
  * Trigger API error (disconnect network)
  * Verify error message shown
  * Verify retry button works

SCOPE - CI/CD Pipeline (GitHub Actions):
- Create .github/workflows/test.yml:
  * Run on: push to feature branches, pull requests
  * Setup: Python 3.11, Node.js 20
  * Install dependencies: pip install -r requirements.txt, npm install
  * Run backend tests: pytest --cov --cov-report=xml
  * Run E2E tests: npx playwright test
  * Upload coverage reports
  * Fail build if coverage <60% or tests fail
- Create .github/workflows/deploy.yml (for later):
  * Run tests before deployment
  * Deploy only if tests pass

TECHNICAL REQUIREMENTS:
- Use pytest for backend tests
- Use pytest-cov for coverage reporting
- Use pytest-mock for mocking
- Use responses library for HTTP mocking
- Use Playwright for E2E tests
- Use separate test database (DATABASE_URL_TEST)
- Mock all external services in tests
- Use fixtures for common test data
- Use factories for model creation (factory_boy)
- Ensure tests are idempotent (can run multiple times)

TESTING BEST PRACTICES:
- Arrange-Act-Assert pattern
- One assertion per test (where reasonable)
- Clear test names (test_agent_creation_requires_authentication)
- Use parametrize for multiple input scenarios
- Clean up after tests (rollback transactions)
- Fast tests (<5 seconds per test)
- Isolate tests (no dependencies between tests)

CONFIGURATION FILES:
- pytest.ini: Configure pytest (test discovery, coverage)
- playwright.config.ts: Configure Playwright (browsers, timeouts, base URL)
- .env.test: Test environment variables (test database, mock API keys)

SUCCESS CRITERIA:
- Backend coverage ≥60%
- All API endpoints tested
- 5 E2E flows tested
- Tests pass in CI/CD
- Tests run in <5 minutes total
- Zero flaky tests
"
```

---

## Phase 3: Infrastructure & Deployment Automation (Week 4)

### Objective
Automate agent deployment, add monitoring, and prepare production infrastructure.

### Scope
This phase addresses:
- All 9 monitoring requirements (FR-MON-001 through FR-MON-009)
- All 8 deployment requirements (FR-DEPLOY-001 through FR-DEPLOY-008)
- Agent process management (systemd automation)
- Error tracking (Sentry)
- Structured logging
- Backup automation

### What Gets Built

**Agent Deployment Automation:**
- SystemD service template for agents
- Auto-generate service files on agent deploy
- Health check endpoint for agents
- Auto-restart on crash
- Deployment status API endpoint
- Agent logs viewable in dashboard

**Monitoring & Observability:**
- Sentry integration for error tracking
- Structured JSON logging across all services
- Log aggregation setup (optional: Papertrail)
- Uptime monitoring setup (UptimeRobot or similar)
- Performance metrics collection
- Admin health dashboard

**Configuration & Documentation:**
- Complete .env.example with all variables
- Document MAGNUS_USER_ID and MAGNUS_USERNAME requirements
- Write deployment guide (dev → production)
- Document backup procedures
- Document rollback procedures
- SSL certificate auto-renewal (Let's Encrypt)

**Files Created:**
- `scripts/generate_agent_service.sh` - SystemD service generator
- `scripts/backup_database.sh` - Backup automation
- `scripts/health_check.py` - Agent health monitoring
- `config/agent-service.template` - SystemD template
- `docs/DEPLOYMENT_GUIDE.md` - Complete deployment docs
- `docs/CONFIGURATION.md` - Environment variable reference
- `.env.example` - Updated with all variables

### Success Criteria
- [ ] Agent deployment fully automated
- [ ] Agents auto-restart on crash
- [ ] Error tracking operational (Sentry)
- [ ] Structured logging implemented
- [ ] Health monitoring active
- [ ] Backup automation tested
- [ ] All configuration documented
- [ ] Deployment guide complete

### Spec-Kit Command

```bash
/speckit.specify "PHASE 3: Automate infrastructure deployment, implement monitoring and observability, and prepare production environment for Epic.ai platform.

SCOPE - Agent Deployment Automation (per SYSTEMD_SERVICES_SETUP.md):
- Create SystemD service template for agents:
  * Template file: /opt/livekit1/config/agent-service.template
  * Variables: {AGENT_ID}, {AGENT_NAME}, {WORKING_DIR}, {PYTHON_PATH}
  * Auto-restart: always, RestartSec=3
  * Logging: StandardOutput=journal, StandardError=journal
- Create service generation script:
  * scripts/generate_agent_service.sh
  * Input: agent_id from database
  * Output: /etc/systemd/system/livekit-agent-{agent_id}.service
  * Actions: systemctl daemon-reload, systemctl enable, systemctl start
- Integrate with agent deployment API:
  * POST /api/user/agents/{id}/deploy calls generation script
  * Update agent status to 'deployed' in database
  * Store service name in agent_configs.systemd_service
- Create health check system:
  * scripts/health_check.py - Monitors all agent processes
  * Checks: Process running, Memory usage <512MB, CPU usage <80%
  * Stores health status in database (agent_configs.health_status)
  * Runs every 60 seconds via cron
- Add agent logs endpoint:
  * GET /api/user/agents/{id}/logs - Returns last 100 lines from journalctl
  * Display logs in dashboard UI (frontend/app/agents/[id]/logs)
- Add deployment status tracking:
  * GET /api/user/agents/{id}/status - Returns systemd status
  * Show status badge in agent list (running/stopped/failed)

SCOPE - Monitoring & Observability:
- Integrate Sentry for error tracking:
  * Install sentry-sdk for Flask backend
  * Install @sentry/nextjs for frontend
  * Environment variable: SENTRY_DSN
  * Track: Exceptions, API errors, frontend crashes
  * Set up: Release tracking, user context, environment tags
- Implement structured JSON logging:
  * Backend: Use python-json-logger
  * Format: {\"timestamp\": \"ISO8601\", \"level\": \"INFO\", \"message\": \"...\", \"user_id\": \"...\", \"request_id\": \"...\"}
  * Log files: /opt/livekit1/logs/backend.json, /opt/livekit1/logs/agents/{agent_id}.json
  * Frontend: Use pino for Next.js
- Set up uptime monitoring:
  * Use UptimeRobot or Pingdom (external service)
  * Monitor: https://ai.epic.dm, https://ai.epic.dm/api/health
  * Alert on: >5 minute downtime, >5 second response time
  * Documentation: How to configure
- Create admin health dashboard:
  * frontend/app/admin/health/page.tsx
  * Display: System uptime, active agents, error rate, response times
  * Metrics: Total users, total agents, total calls (today/week/month)
  * Agent health: List all agents with status (running/stopped/memory/cpu)
  * Recent errors: Last 20 errors from Sentry
- Implement performance metrics:
  * Track API response times (middleware)
  * Track call quality metrics (duration, completion rate)
  * Track cost metrics (per user, platform-wide)
  * Store in database: usage table

SCOPE - Configuration & Documentation:
- Complete .env.example file:
  * Add MAGNUS_USER_ID with description
  * Add MAGNUS_USERNAME with description
  * Add RESEND_API_KEY with description
  * Add SENTRY_DSN with description
  * Add all missing variables with explanations
  * Add comments for required vs optional
- Create CONFIGURATION.md:
  * docs/CONFIGURATION.md
  * Section: Environment Variables (complete reference)
  * Section: Magnus Billing Setup (user ID, username, API keys)
  * Section: Email Service Setup (Resend API key, sender domain)
  * Section: Monitoring Setup (Sentry, UptimeRobot)
  * Section: Database Setup (PostgreSQL, migrations)
  * Section: SSL Setup (Let's Encrypt, certbot)
- Create DEPLOYMENT_GUIDE.md:
  * docs/DEPLOYMENT_GUIDE.md
  * Section: Prerequisites (VPS, domain, DNS, ports)
  * Section: Initial Setup (git clone, environment, dependencies)
  * Section: Database Setup (PostgreSQL, migrations, seed data)
  * Section: Backend Deployment (SystemD service, logs)
  * Section: Frontend Deployment (Next.js build, SystemD service)
  * Section: SSL Configuration (certbot, auto-renewal)
  * Section: Agent Deployment (first agent, testing)
  * Section: Monitoring Setup (Sentry, UptimeRobot, health checks)
  * Section: Troubleshooting (common issues, solutions)
- Document backup procedures:
  * scripts/backup_database.sh - PostgreSQL backup to S3/local
  * Backup schedule: Daily at 2 AM via cron
  * Retention: 7 daily, 4 weekly, 12 monthly
  * Test: Restore procedure documented
- Document rollback procedures:
  * docs/ROLLBACK_GUIDE.md
  * How to rollback: Database migration, code deploy, agent changes
  * Emergency procedures: System down, data corruption

SCOPE - Backup & Security:
- Database backup automation:
  * scripts/backup_database.sh
  * Backup to: /opt/livekit1/backups/ or S3 bucket
  * Compress: gzip
  * Encrypt: GPG (optional)
  * Upload: S3 or remote server (optional)
- SSL certificate auto-renewal:
  * Use certbot with Let's Encrypt
  * Cron job: Renew every 60 days
  * Reload: Apache/Nginx after renewal
  * Monitor: Expiry date in admin dashboard
- Security hardening checklist:
  * docs/SECURITY_HARDENING.md
  * Firewall: UFW rules (allow 22, 80, 443, block all else)
  * Fail2ban: SSH protection
  * Rate limiting: API endpoints (Flask-Limiter)
  * Secrets management: Use environment variables, never commit secrets
  * HTTPS: Force redirect, HSTS header
  * CORS: Whitelist specific origins

TECHNICAL REQUIREMENTS:
- Use systemd for process management (agent services)
- Use journalctl for log viewing
- Use Sentry SDK for error tracking
- Use python-json-logger for structured logging
- Use UptimeRobot or Pingdom for uptime monitoring
- Use PostgreSQL pg_dump for backups
- Use certbot for SSL certificates
- Use UFW for firewall configuration
- Use fail2ban for SSH protection

SUCCESS CRITERIA:
- Agents deploy with single API call
- Agents auto-restart within 3 seconds of crash
- All errors tracked in Sentry with context
- All logs in JSON format
- Health dashboard shows real-time status
- Backups run daily and tested
- SSL certificates auto-renew
- All configuration documented
- Deployment guide complete and tested
"
```

---

## Phase 4: Production Hardening & Launch Prep (Week 5-6)

### Objective
Complete Magnus Billing production setup, security hardening, and final production testing.

### Scope
This phase addresses:
- Magnus Billing production configuration and testing
- Security hardening (rate limiting, fail2ban, secrets management)
- Performance optimization
- Load testing
- Final bug fixes
- Launch preparation

### What Gets Built

**Magnus Billing Production:**
- Complete configuration with production credentials
- End-to-end testing of DID provisioning
- SIP routing verification with real calls
- Error handling for edge cases
- Fallback mechanisms for downtime

**Security Hardening:**
- Enforce rate limiting on all API endpoints
- Configure fail2ban for SSH
- Set up secrets management (Vault or AWS Secrets)
- Configure firewall rules (UFW)
- Input validation and sanitization audit
- Security vulnerability scan

**Performance & Testing:**
- Load testing (simulate 100 concurrent users)
- Performance optimization based on results
- Database query optimization
- Frontend bundle optimization
- Final browser compatibility testing
- Final mobile responsiveness testing

**Launch Preparation:**
- User acceptance testing
- Create onboarding materials
- Create support documentation
- Create marketing materials (optional)
- Set up status page
- Launch checklist verification

**Files Created:**
- `tests/load_tests/` - Load testing scripts
- `docs/USER_GUIDE.md` - End-user documentation
- `docs/SUPPORT_GUIDE.md` - Support team reference
- `docs/LAUNCH_CHECKLIST.md` - Pre-launch verification
- `docs/SECURITY_AUDIT.md` - Security review results

### Success Criteria
- [ ] Magnus Billing works in production
- [ ] All security measures active
- [ ] Load testing passed (100 concurrent users)
- [ ] All browsers tested (Chrome, Firefox, Safari)
- [ ] Launch checklist 100% complete
- [ ] Support documentation ready
- [ ] Monitoring and alerts configured
- [ ] Backup and recovery tested

### Spec-Kit Command

```bash
/speckit.specify "PHASE 4: Complete production hardening, security audit, Magnus Billing production setup, performance optimization, and launch preparation for Epic.ai platform.

SCOPE - Magnus Billing Production Setup (per MAGNUS_DID_PROVISIONING.md):
- Complete production configuration:
  * Verify MAGNUS_USER_ID is set correctly for production account
  * Verify MAGNUS_USERNAME matches production Asterisk user
  * Verify MAGNUS_API_KEY and MAGNUS_SECRET_KEY are production credentials
  * Test authentication with production API (https://voice.epic.dm)
  * Document configuration in CONFIGURATION.md
- End-to-end DID provisioning testing:
  * Test: Provision new DID via POST /api/user/phone-numbers/provision
  * Verify: DID appears in Magnus Billing dashboard
  * Verify: DID stored in phone_number_pool table
  * Test error handling: No DIDs available, API timeout, invalid credentials
  * Test fallback: Local pool if Magnus unavailable
- SIP routing verification:
  * Test: Assign DID to agent
  * Verify: SIP trunk configured in Magnus
  * Test: Make real phone call to provisioned number
  * Verify: Call routes to LiveKit room
  * Verify: Agent joins room and responds
  * Test error handling: SIP trunk down, invalid configuration
- Production monitoring:
  * Add Magnus API health check to admin dashboard
  * Monitor: API response time, success rate, error rate
  * Alert on: API errors, provisioning failures
  * Log: All Magnus API calls with request/response

SCOPE - Security Hardening:
- Rate limiting enforcement:
  * Install Flask-Limiter for backend
  * Configure: 100 requests/minute per user (authenticated)
  * Configure: 20 requests/minute per IP (unauthenticated)
  * Endpoints: All /api/* routes
  * Response: 429 Too Many Requests with retry-after header
  * Whitelist: Admin IPs, monitoring services
- Fail2ban configuration:
  * Install fail2ban
  * Configure: Ban after 5 failed SSH attempts
  * Ban duration: 1 hour
  * Monitor: /var/log/auth.log
  * Alert: Email admin on ban
- Secrets management:
  * Audit: No secrets in code or git history
  * Use: Environment variables for all secrets
  * Optional: Migrate to Vault or AWS Secrets Manager
  * Document: How to rotate secrets
- Firewall configuration:
  * Install and enable UFW
  * Rules: Allow 22 (SSH), 80 (HTTP), 443 (HTTPS), 5001 (backend), 3001 (frontend)
  * Rules: Deny all other incoming
  * Rules: Allow all outgoing
  * Test: Verify services accessible, others blocked
- Input validation audit:
  * Audit: All API endpoints for SQL injection vulnerabilities
  * Audit: All forms for XSS vulnerabilities
  * Audit: File upload endpoints (if any) for malicious files
  * Fix: Add validation/sanitization where missing
  * Test: Try common attack vectors
- HTTPS enforcement:
  * Verify: All HTTP requests redirect to HTTPS
  * Verify: HSTS header set (Strict-Transport-Security)
  * Verify: Secure cookies (httpOnly, secure, sameSite)
  * Verify: No mixed content warnings
- Security vulnerability scan:
  * Run: npm audit for frontend
  * Run: pip-audit for backend
  * Run: OWASP ZAP or similar (optional)
  * Fix: All critical and high vulnerabilities
  * Document: Known vulnerabilities and mitigation

SCOPE - Performance Optimization:
- Load testing:
  * Install: Locust or k6 for load testing
  * Test scenario 1: 100 concurrent users browsing dashboard
  * Test scenario 2: 50 concurrent users creating agents
  * Test scenario 3: 20 concurrent users making calls
  * Measure: Response time (p50, p95, p99), error rate, throughput
  * Target: <500ms response time (p95), <1% error rate
- Database optimization:
  * Audit: All queries for missing indexes
  * Add: Indexes on user_id, agent_id, phone_number, created_at
  * Optimize: Slow queries (>100ms)
  * Enable: Query logging to identify bottlenecks
  * Test: Measure query performance before/after
- Frontend optimization:
  * Audit: Bundle size (target: <200KB initial load)
  * Enable: Code splitting for routes
  * Optimize: Images (use next/image, lazy loading)
  * Minimize: Third-party scripts
  * Test: Lighthouse performance score (target: >90)
- Caching strategy:
  * Add: Redis for session caching (optional)
  * Add: Browser caching headers for static assets
  * Add: API response caching for stats (5 minute TTL)
  * Test: Measure cache hit rate

SCOPE - Browser & Mobile Testing:
- Browser compatibility testing:
  * Test on: Chrome (latest), Firefox (latest), Safari (latest), Edge (latest)
  * Test features: Agent creation, phone provisioning, call history, analytics
  * Fix: Any browser-specific issues
  * Document: Minimum supported browser versions
- Mobile responsiveness testing:
  * Test on: iPhone (Safari), Android (Chrome)
  * Test features: Dashboard, agent list, call history
  * Fix: Layout issues, touch targets too small
  * Note: Full mobile optimization is future enhancement

SCOPE - Launch Preparation:
- User acceptance testing:
  * Recruit: 3-5 beta users
  * Test: Complete user journey (signup → agent creation → call)
  * Collect: Feedback on UX, bugs, confusion points
  * Fix: Critical issues before launch
- Create user documentation:
  * docs/USER_GUIDE.md
  * Section: Getting started (signup, first agent)
  * Section: Creating agents (wizard, settings, voices)
  * Section: Phone numbers (provisioning, assignment)
  * Section: Making calls (testing, monitoring)
  * Section: Billing (plans, usage, invoices)
  * Section: Troubleshooting (common issues, support)
- Create support documentation:
  * docs/SUPPORT_GUIDE.md
  * Section: Common user issues (agent not responding, phone not working)
  * Section: Admin actions (delete user, provision phone, check logs)
  * Section: Escalation procedures (critical bugs, security incidents)
- Create launch checklist:
  * docs/LAUNCH_CHECKLIST.md
  * Infrastructure: [ ] SSL configured, [ ] Backups tested, [ ] Monitoring active
  * Testing: [ ] Load tests passed, [ ] UAT completed, [ ] Security audit done
  * Documentation: [ ] User guide complete, [ ] Support guide ready
  * Operations: [ ] Support email set up, [ ] Status page configured
  * Marketing: [ ] Landing page live, [ ] Pricing confirmed
- Set up status page:
  * Use: StatusPage.io or self-hosted (Cachet)
  * Display: System status, planned maintenance, incidents
  * Integrate: Monitoring alerts
- Final verification:
  * Run through launch checklist
  * Fix any remaining issues
  * Get final approval from stakeholders

TECHNICAL REQUIREMENTS:
- Use Flask-Limiter for rate limiting
- Use fail2ban for SSH protection
- Use UFW for firewall
- Use Locust or k6 for load testing
- Use pip-audit and npm audit for vulnerability scanning
- Use Lighthouse for performance testing
- Use BrowserStack or similar for cross-browser testing

SUCCESS CRITERIA:
- Magnus Billing production tested with real calls
- All security hardening measures active
- Rate limiting enforced on all APIs
- Load testing passed (100 concurrent users)
- Database queries optimized (<100ms)
- Frontend Lighthouse score >90
- All browsers tested and working
- User guide and support docs complete
- Launch checklist 100% verified
- Backup and recovery tested successfully
"
```

---

## Summary: Single Commands for All Phases

Here are the 4 commands you can run to complete all phases:

### Phase 1 (Weeks 1-2): UX & Integration
```bash
/speckit.specify "PHASE 1: Complete UX polish and frontend-backend integration across all 21 pages of the Epic.ai platform. [Full spec text above]"
```

### Phase 2 (Week 3): Testing
```bash
/speckit.specify "PHASE 2: Establish comprehensive automated testing infrastructure for Epic.ai platform including backend unit tests, integration tests, and E2E tests. [Full spec text above]"
```

### Phase 3 (Week 4): Infrastructure
```bash
/speckit.specify "PHASE 3: Automate infrastructure deployment, implement monitoring and observability, and prepare production environment for Epic.ai platform. [Full spec text above]"
```

### Phase 4 (Weeks 5-6): Production Launch
```bash
/speckit.specify "PHASE 4: Complete production hardening, security audit, Magnus Billing production setup, performance optimization, and launch preparation for Epic.ai platform. [Full spec text above]"
```

---

## Execution Workflow

For each phase:

1. **Specify** - Run the command above
   ```bash
   /speckit.specify "PHASE X: [full description]"
   ```

2. **Clarify** (if needed) - Answer any questions
   ```bash
   /speckit.clarify
   ```

3. **Plan** - Create technical implementation plan
   ```bash
   /speckit.plan
   ```

4. **Tasks** - Break into actionable tasks
   ```bash
   /speckit.tasks
   ```

5. **Analyze** (optional) - Verify consistency
   ```bash
   /speckit.analyze
   ```

6. **Implement** - Execute the implementation
   ```bash
   /speckit.implement
   ```

---

## Timeline

| Phase | Duration | Work Days | Estimated Effort |
|-------|----------|-----------|------------------|
| Phase 1: UX & Integration | 2 weeks | 10 days | 60-80 hours |
| Phase 2: Testing | 1 week | 5 days | 30-40 hours |
| Phase 3: Infrastructure | 1 week | 5 days | 30-40 hours |
| Phase 4: Production Launch | 2 weeks | 10 days | 60-80 hours |
| **Total** | **6 weeks** | **30 days** | **180-240 hours** |

**Assumptions**: 1 full-time developer, 8 hours/day

---

## Dependencies

- **Phase 1** can start immediately (no dependencies)
- **Phase 2** depends on Phase 1 (need features to test)
- **Phase 3** can run parallel to Phase 2 (independent)
- **Phase 4** depends on Phases 1, 2, 3 (final integration)

**Optimization**: Run Phase 2 and Phase 3 in parallel to save 1 week → **5 weeks total**

---

## Success Metrics

### Phase 1 Completion
- [ ] Zero hardcoded demo data in frontend
- [ ] All forms validate and show errors
- [ ] All pages have loading states
- [ ] All actions show toast notifications
- [ ] Lighthouse score >90

### Phase 2 Completion
- [ ] Backend test coverage ≥60%
- [ ] 5 E2E tests passing
- [ ] CI/CD pipeline running
- [ ] Tests pass consistently

### Phase 3 Completion
- [ ] Agents deploy automatically
- [ ] Agents auto-restart on crash
- [ ] Sentry tracking all errors
- [ ] Health dashboard operational
- [ ] Backups running daily

### Phase 4 Completion
- [ ] Magnus Billing production tested
- [ ] Security audit complete
- [ ] Load testing passed
- [ ] User guide complete
- [ ] Launch checklist 100%

---

## Next Steps

**To start Phase 1 immediately:**

```bash
cd /opt/livekit1
/speckit.specify "PHASE 1: Complete UX polish and frontend-backend integration across all 21 pages of the Epic.ai platform. ..."
```

Copy the full Phase 1 spec text from above into the command.

---

**This roadmap consolidates all gaps into 4 major phases that can be executed with spec-kit!** 🚀
