# Epic.ai Spec-Kit Quick Start

**Want to start development right now?** Use these single commands for each phase.

---

## 🚀 Execute Entire Phases at Once

Instead of specifying individual features, you can now execute **complete phases** with a single spec-kit command.

---

## Phase 1: UX Polish & Frontend Integration (Weeks 1-2)

**What it does:** Completes all UX requirements and connects frontend to backend APIs.

**Command:**
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
- Connect agent builder wizard (/dashboard/agents/new) to backend API: Step 1 basic info, Step 2 instructions and voice, Step 3 advanced settings, submit to POST /api/user/agents, show success and redirect
- Connect phone provisioning modal to backend: POST /api/user/phone-numbers/provision, show loading during Magnus API call, display provisioned number, handle errors
- Replace demo data with real API calls: Dashboard stats from GET /api/user/stats, agent list from GET /api/user/agents, call history from GET /api/user/call-logs, phone numbers from GET /api/user/phone-numbers, analytics from GET /api/user/stats/calls
- Connect settings page to user profile: Load from GET /api/user/profile, update via PUT /api/user/profile
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

SUCCESS CRITERIA:
- Zero hardcoded demo data in frontend
- All user actions show immediate feedback
- No confusing error messages
- Forms validate before submission
- All async operations show loading state
- Lighthouse accessibility score >90
- Zero console errors in browser"
```

---

## Phase 2: Testing & Quality Assurance (Week 3)

**What it does:** Establishes automated testing with 60% coverage, integration tests, and E2E tests.

**Command:**
```bash
/speckit.specify "PHASE 2: Establish comprehensive automated testing infrastructure for Epic.ai platform including backend unit tests, integration tests, and E2E tests.

SCOPE - Backend Unit Tests (pytest):
- Create test suite for all Flask routes in user_dashboard.py: authentication, agent CRUD, phone numbers, call logs, stats, admin, LiveKit routes
- Create test suite for backend/agent_creator.py: file generation, directory structure, template rendering, validation
- Create test suite for phone_number_manager.py: provisioning, assignment, pool management
- Target minimum 60% code coverage
- Use pytest fixtures for database setup/teardown
- Use test database (SQLite in memory or separate PostgreSQL)
- Mock all external API calls

SCOPE - Integration Tests:
- Magnus Billing integration tests (mocked): authentication HMAC-SHA512, DID provisioning, SIP configuration, error handling, use responses library
- LiveKit integration tests (mocked): token generation, room creation, agent dispatch
- Stripe integration tests (use Stripe test mode): subscription creation, webhook handling, payment method update

SCOPE - End-to-End Tests (Playwright):
- E2E Test 1: Complete user journey - signup, agent builder, phone provisioning, assign phone, verify in list (target <2 minutes)
- E2E Test 2: Admin user deletion - login as admin, search user, delete with confirmation, verify cascade
- E2E Test 3: Agent editing - login, select agent, edit instructions, save, verify persisted
- E2E Test 4: Call history viewing - login, navigate to calls, filter by date and agent, verify data
- E2E Test 5: Error handling - trigger API error, verify error message, verify retry button works

SCOPE - CI/CD Pipeline (GitHub Actions):
- Create .github/workflows/test.yml: Run on push to feature branches and pull requests, setup Python 3.11 and Node.js 20, install dependencies, run pytest with coverage, run Playwright tests, upload coverage reports, fail build if coverage <60% or tests fail

TECHNICAL REQUIREMENTS:
- Use pytest for backend tests
- Use pytest-cov for coverage reporting
- Use pytest-mock for mocking
- Use responses library for HTTP mocking
- Use Playwright for E2E tests
- Use separate test database (DATABASE_URL_TEST)
- Mock all external services in tests
- Use fixtures for common test data
- Ensure tests are idempotent (can run multiple times)

SUCCESS CRITERIA:
- Backend coverage ≥60%
- All API endpoints tested
- 5 E2E flows tested
- Tests pass in CI/CD
- Tests run in <5 minutes total
- Zero flaky tests"
```

---

## Phase 3: Infrastructure & Deployment Automation (Week 4)

**What it does:** Automates agent deployment, adds monitoring with Sentry, and prepares production infrastructure.

**Command:**
```bash
/speckit.specify "PHASE 3: Automate infrastructure deployment, implement monitoring and observability, and prepare production environment for Epic.ai platform.

SCOPE - Agent Deployment Automation (per SYSTEMD_SERVICES_SETUP.md):
- Create SystemD service template for agents with variables for AGENT_ID, AGENT_NAME, WORKING_DIR, auto-restart always with RestartSec=3, logging to journal
- Create service generation script scripts/generate_agent_service.sh that takes agent_id, outputs service file, runs systemctl commands
- Integrate with deployment API: POST /api/user/agents/{id}/deploy calls generation script, updates status to deployed, stores service name
- Create health check system scripts/health_check.py that monitors all agent processes every 60 seconds via cron, checks process running and memory/CPU usage, stores health status in database
- Add agent logs endpoint GET /api/user/agents/{id}/logs that returns last 100 lines from journalctl, display in dashboard UI
- Add deployment status tracking GET /api/user/agents/{id}/status that returns systemd status, show status badge in agent list

SCOPE - Monitoring & Observability:
- Integrate Sentry for error tracking: Install sentry-sdk for Flask and @sentry/nextjs for frontend, add SENTRY_DSN environment variable, track exceptions and API errors, set up release tracking and user context
- Implement structured JSON logging: Backend use python-json-logger with format including timestamp, level, message, user_id, request_id, log to /opt/livekit1/logs/backend.json and per-agent logs
- Set up uptime monitoring: Use UptimeRobot or Pingdom to monitor https://ai.epic.dm and health endpoint, alert on >5 minute downtime or >5 second response time
- Create admin health dashboard at frontend/app/admin/health/page.tsx showing system uptime, active agents, error rate, response times, total users/agents/calls, agent health with status, recent errors from Sentry
- Implement performance metrics: Track API response times via middleware, track call quality metrics, track cost metrics, store in usage table

SCOPE - Configuration & Documentation:
- Complete .env.example file with MAGNUS_USER_ID, MAGNUS_USERNAME, RESEND_API_KEY, SENTRY_DSN and all missing variables with descriptions and required vs optional comments
- Create docs/CONFIGURATION.md with sections for environment variables, Magnus Billing setup, email service setup, monitoring setup, database setup, SSL setup
- Create docs/DEPLOYMENT_GUIDE.md with sections for prerequisites, initial setup, database setup, backend deployment, frontend deployment, SSL configuration, agent deployment, monitoring setup, troubleshooting
- Document backup procedures in scripts/backup_database.sh with daily backups at 2 AM via cron, retention policy, test restore procedure
- Document rollback procedures in docs/ROLLBACK_GUIDE.md for database migration, code deploy, agent changes, emergency procedures

SCOPE - Backup & Security:
- Database backup automation: scripts/backup_database.sh to /opt/livekit1/backups/ or S3 bucket, compress with gzip, optional GPG encryption
- SSL certificate auto-renewal: Use certbot with Let's Encrypt, cron job to renew every 60 days, reload Apache/Nginx after renewal, monitor expiry date
- Security hardening checklist: docs/SECURITY_HARDENING.md with UFW firewall rules, fail2ban for SSH, rate limiting on APIs, secrets management, HTTPS enforcement, CORS configuration

TECHNICAL REQUIREMENTS:
- Use systemd for process management
- Use journalctl for log viewing
- Use Sentry SDK for error tracking
- Use python-json-logger for structured logging
- Use UptimeRobot or Pingdom for uptime monitoring
- Use PostgreSQL pg_dump for backups
- Use certbot for SSL certificates
- Use UFW for firewall, fail2ban for SSH protection

SUCCESS CRITERIA:
- Agents deploy with single API call
- Agents auto-restart within 3 seconds of crash
- All errors tracked in Sentry with context
- All logs in JSON format
- Health dashboard shows real-time status
- Backups run daily and tested
- SSL certificates auto-renew
- All configuration documented
- Deployment guide complete and tested"
```

---

## Phase 4: Production Hardening & Launch (Weeks 5-6)

**What it does:** Completes Magnus production setup, security hardening, performance optimization, and launch prep.

**Command:**
```bash
/speckit.specify "PHASE 4: Complete production hardening, security audit, Magnus Billing production setup, performance optimization, and launch preparation for Epic.ai platform.

SCOPE - Magnus Billing Production Setup (per MAGNUS_DID_PROVISIONING.md):
- Complete production configuration: Verify MAGNUS_USER_ID, MAGNUS_USERNAME, MAGNUS_API_KEY, MAGNUS_SECRET_KEY for production, test authentication with https://voice.epic.dm, document in CONFIGURATION.md
- End-to-end DID provisioning testing: Test provision via POST /api/user/phone-numbers/provision, verify DID in Magnus dashboard and phone_number_pool table, test error handling for no DIDs, API timeout, invalid credentials, test local fallback
- SIP routing verification: Test assign DID to agent, verify SIP trunk in Magnus, make real phone call to number, verify routes to LiveKit room, verify agent joins and responds, test error handling for SIP trunk down
- Production monitoring: Add Magnus API health check to admin dashboard, monitor API response time and success rate, alert on errors, log all Magnus API calls with request/response

SCOPE - Security Hardening:
- Rate limiting enforcement: Install Flask-Limiter, configure 100 req/min per user authenticated and 20 req/min per IP unauthenticated, apply to all /api/* routes, return 429 with retry-after header, whitelist admin IPs
- Fail2ban configuration: Install fail2ban, ban after 5 failed SSH attempts for 1 hour, monitor /var/log/auth.log, email admin on ban
- Secrets management: Audit no secrets in code or git, use environment variables for all secrets, optionally migrate to Vault or AWS Secrets Manager, document secret rotation
- Firewall configuration: Install UFW, allow ports 22, 80, 443, 5001, 3001, deny all other incoming, allow all outgoing, test services accessible
- Input validation audit: Audit all API endpoints for SQL injection, all forms for XSS, file uploads for malicious files, add validation/sanitization where missing, test attack vectors
- HTTPS enforcement: Verify HTTP redirects to HTTPS, HSTS header set, secure cookies with httpOnly and sameSite, no mixed content warnings
- Security vulnerability scan: Run npm audit for frontend, pip-audit for backend, optionally OWASP ZAP, fix all critical and high vulnerabilities, document known issues

SCOPE - Performance Optimization:
- Load testing: Install Locust or k6, test 100 concurrent users on dashboard, 50 creating agents, 20 making calls, measure response time p50/p95/p99 and error rate, target <500ms p95 and <1% error rate
- Database optimization: Audit queries for missing indexes, add indexes on user_id, agent_id, phone_number, created_at, optimize slow queries >100ms, enable query logging, measure performance before/after
- Frontend optimization: Audit bundle size target <200KB, enable code splitting, optimize images with next/image and lazy loading, minimize third-party scripts, test Lighthouse score target >90
- Caching strategy: Add Redis for session caching optional, add browser caching headers for static assets, add API response caching for stats with 5 minute TTL, test cache hit rate

SCOPE - Browser & Mobile Testing:
- Browser compatibility testing: Test on Chrome, Firefox, Safari, Edge latest versions for agent creation, phone provisioning, call history, analytics, fix browser-specific issues, document minimum supported versions
- Mobile responsiveness testing: Test on iPhone Safari and Android Chrome for dashboard, agent list, call history, fix layout issues and touch target sizes, note full mobile optimization is future enhancement

SCOPE - Launch Preparation:
- User acceptance testing: Recruit 3-5 beta users, test complete journey from signup to call, collect feedback on UX and bugs, fix critical issues before launch
- Create user documentation: docs/USER_GUIDE.md with sections for getting started, creating agents, phone numbers, making calls, billing, troubleshooting
- Create support documentation: docs/SUPPORT_GUIDE.md with common user issues, admin actions, escalation procedures
- Create launch checklist: docs/LAUNCH_CHECKLIST.md verifying infrastructure, testing, documentation, operations, marketing
- Set up status page: Use StatusPage.io or self-hosted Cachet, display system status and maintenance, integrate monitoring alerts
- Final verification: Run through launch checklist, fix remaining issues, get stakeholder approval

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
- Database queries optimized <100ms
- Frontend Lighthouse score >90
- All browsers tested and working
- User guide and support docs complete
- Launch checklist 100% verified
- Backup and recovery tested successfully"
```

---

## 📋 Workflow for Each Phase

After running the `/speckit.specify` command:

1. **Answer clarifications** (if spec-kit asks questions)
2. **Run `/speckit.plan`** - Creates technical implementation plan
3. **Run `/speckit.tasks`** - Breaks plan into actionable tasks
4. **Run `/speckit.implement`** - Executes the implementation
5. **Test and verify** - Check success criteria are met

---

## 🎯 Quick Reference

| Phase | Duration | Focus | Key Deliverable |
|-------|----------|-------|-----------------|
| **Phase 1** | 2 weeks | UX + Integration | Polished UI, connected APIs |
| **Phase 2** | 1 week | Testing | 60% coverage, E2E tests, CI/CD |
| **Phase 3** | 1 week | Infrastructure | Auto-deployment, monitoring, backups |
| **Phase 4** | 2 weeks | Production | Security, Magnus tested, launch ready |

**Total**: 6 weeks to production (or 5 weeks if Phase 2 & 3 run parallel)

---

## 📚 More Information

- **Full Roadmap**: [PRODUCTION_ROADMAP.md](.specify/PRODUCTION_ROADMAP.md)
- **Detailed Analysis**: [COMPLETENESS_ANALYSIS.md](.specify/COMPLETENESS_ANALYSIS.md)
- **How-to Guide**: [GETTING_STARTED.md](.specify/GETTING_STARTED.md)
- **All Requirements**: [BASELINE_SPEC.md](.specify/BASELINE_SPEC.md)
- **Principles**: [constitution.md](.specify/memory/constitution.md)

---

## 🚀 Start Now

Copy one of the phase commands above and run:

```bash
/speckit.specify "PHASE 1: Complete UX polish and frontend-backend integration..."
```

Then follow the workflow: clarify → plan → tasks → implement

**That's it!** Spec-kit handles the rest. 🎉
