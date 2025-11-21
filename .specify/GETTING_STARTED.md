# Getting Started with Spec-Kit for Epic.ai

## 🎉 Setup Complete!

Your Epic.ai project is now configured for **spec-driven development** with GitHub Spec-Kit. This guide explains how to use spec-kit to continue building your voice AI platform.

---

## 📁 What Was Created

### 1. Project Constitution (`.specify/memory/constitution.md`)
Your project's **core principles and standards**:
- ✅ Multi-Tenant Isolation (NON-NEGOTIABLE)
- ✅ Voice Quality First
- ✅ Agent Configurability Without Code
- ✅ Test-Driven Development
- ✅ Real-Time Communication Reliability
- ✅ Observability and Monitoring
- ✅ Cost Transparency

Plus security requirements, development workflow, performance standards, and governance rules.

### 2. Project State Documentation (`.specify/PROJECT_STATE.md`)
A comprehensive snapshot of your current codebase:
- Technology stack (Python/Flask, Next.js, LiveKit, etc.)
- File locations and architecture
- Implemented features (✅), in-progress features (🔄), and gaps (❌)
- Recent git activity and development focus

### 3. Baseline Specification (`.specify/BASELINE_SPEC.md`)
A detailed specification of Epic.ai as it exists today:
- User scenarios and flows
- Functional requirements for all features
- Success criteria and metrics
- Data models and integrations
- Non-functional requirements (performance, security, scalability)
- Current status summary

### 4. Slash Commands (`.claude/commands/`)
Eight spec-kit commands for development workflow:
- `/speckit.constitution` - Update project principles
- `/speckit.specify` - Create feature specifications
- `/speckit.plan` - Create implementation plans
- `/speckit.tasks` - Generate actionable tasks
- `/speckit.implement` - Execute implementations
- `/speckit.clarify` - Clarify ambiguous requirements
- `/speckit.analyze` - Cross-artifact consistency analysis
- `/speckit.checklist` - Generate quality checklists

### 5. Security Configuration
- `.claude/` and `.specify/memory/` added to `.gitignore` (prevents credential leakage)

---

## 🚀 How to Use Spec-Kit

### Workflow Overview

Spec-kit follows a structured workflow for building features:

```
1. CONSTITUTION  → Establish principles (one-time setup)
2. SPECIFY       → Define WHAT you want to build
3. CLARIFY       → Resolve ambiguities (optional)
4. PLAN          → Define HOW to build it
5. TASKS         → Break plan into actionable steps
6. ANALYZE       → Verify consistency (optional)
7. IMPLEMENT     → Execute the implementation
```

---

## 📝 Step-by-Step: Building a New Feature

### Example: "Add Agent Function Calling Support"

#### Step 1: Create Feature Specification
```
/speckit.specify "Add support for agents to call custom functions during conversations, like looking up order status or checking inventory"
```

**What happens:**
- Spec-kit creates a new git branch (e.g., `feature/agent-function-calling`)
- Generates a specification document at `.specify/features/agent-function-calling/spec.md`
- Documents WHAT the feature should do (user scenarios, requirements, success criteria)
- Creates a quality checklist to validate the spec
- Asks clarifying questions if needed (max 3 questions)

**Your job:**
- Review the generated spec
- Answer any clarification questions
- Verify requirements match your vision

#### Step 2: Clarify Ambiguities (Optional)
```
/speckit.clarify
```

**What happens:**
- Reviews the spec for unclear areas
- Asks structured questions with suggested answers
- Updates spec with your responses

**When to use:**
- Spec has `[NEEDS CLARIFICATION]` markers
- Feature scope is unclear
- Multiple implementation approaches exist

#### Step 3: Create Implementation Plan
```
/speckit.plan
```

**What happens:**
- Transforms spec (WHAT) into plan (HOW)
- Defines technical approach, architecture, file changes
- Lists specific implementation steps
- Identifies risks and dependencies
- Creates plan document at `.specify/features/agent-function-calling/plan.md`

**Your job:**
- Review technical decisions
- Approve or suggest alternative approaches

#### Step 4: Generate Tasks
```
/speckit.tasks
```

**What happens:**
- Breaks plan into actionable tasks
- Assigns priority to each task
- Estimates effort
- Creates task list at `.specify/features/agent-function-calling/tasks.md`

**Your job:**
- Review task breakdown
- Adjust priorities if needed

#### Step 5: Analyze Consistency (Optional)
```
/speckit.analyze
```

**What happens:**
- Checks spec, plan, and tasks for consistency
- Verifies alignment with constitution principles
- Identifies gaps or conflicts
- Generates analysis report

**When to use:**
- Before starting implementation
- After major plan changes
- To validate complex features

#### Step 6: Implement
```
/speckit.implement
```

**What happens:**
- Executes tasks from the task list
- Writes code, tests, and documentation
- Follows constitution principles
- Updates task status as work progresses

**Your job:**
- Monitor progress
- Provide feedback during implementation
- Test completed features

---

## 🔄 Continuing Development on Epic.ai

### For Features Already In Progress

If you have partially implemented features (like "Complete SIP Integration" or "Finish Billing System"), you can use spec-kit to formalize them:

1. **Document Current State**:
   ```
   /speckit.specify "Complete end-to-end SIP call routing with Magnus Billing and LiveKit integration"
   ```

2. **Create Plan for Remaining Work**:
   ```
   /speckit.plan
   ```

3. **Break Into Tasks**:
   ```
   /speckit.tasks
   ```

4. **Implement Missing Pieces**:
   ```
   /speckit.implement
   ```

### For Entirely New Features

Use the full workflow (specify → clarify → plan → tasks → implement) for features like:
- Agent marketplace
- Webhooks system
- Multi-agent handoffs
- Knowledge base integration
- Advanced analytics

---

## 📚 Key Documents Reference

### Constitution (`.specify/memory/constitution.md`)
**When to read:**
- Before starting any new feature
- When making architectural decisions
- During code reviews

**What it tells you:**
- Non-negotiable principles (multi-tenancy, voice quality, no-code, TDD)
- Security requirements
- Performance standards
- Development workflow rules

### Baseline Spec (`.specify/BASELINE_SPEC.md`)
**When to read:**
- Before planning new features (to avoid duplicating work)
- When onboarding new developers
- When documenting existing system

**What it tells you:**
- What's already built (✅ Completed)
- What's in progress (🔄 In Progress)
- What's not started (❌ Not Implemented)
- All user scenarios, requirements, data models

### Project State (`.specify/PROJECT_STATE.md`)
**When to read:**
- When understanding codebase structure
- When locating specific files
- When checking recent development activity

**What it tells you:**
- File locations (`user_dashboard.py`, `frontend/`, etc.)
- Technology stack details
- Integration points
- Technical debt areas

---

## 🎯 Best Practices

### 1. Always Start with Constitution
Before building anything, check if it aligns with constitution principles:
- Multi-tenant isolation? ✅
- No-code user experience? ✅
- Tests included? ✅
- Observable/monitorable? ✅

### 2. Write Specs BEFORE Code
Spec-kit enforces **spec-first development**:
- Spec = WHAT (requirements, user value)
- Plan = HOW (technical approach)
- Tasks = WHEN (execution steps)

### 3. Use Clarify Sparingly
Only ask clarifying questions when:
- Choice significantly impacts scope
- No reasonable default exists
- Multiple valid interpretations

### 4. Keep Specs Technology-Agnostic
Good: "User can search agents by name"
Bad: "Add Elasticsearch index for agent.name field"

### 5. Update Baseline Spec Regularly
After completing features, update `.specify/BASELINE_SPEC.md`:
- Change 🔄 to ✅ for completed items
- Add new requirements as you discover them
- Keep success criteria current

### 6. Review Constitution Quarterly
As you learn what works, amend the constitution:
- Add new principles based on lessons learned
- Update standards that proved unrealistic
- Remove principles that don't add value

---

## 🛠️ Troubleshooting

### "Slash command not found"
**Issue**: Commands like `/speckit.specify` don't work
**Solution**: Make sure you're using Claude Code (this is Claude Code-specific)

### "Spec too vague"
**Issue**: Generated spec lacks detail
**Solution**: Provide more context in your command:
```
# Vague
/speckit.specify "Add billing"

# Detailed
/speckit.specify "Add Stripe billing integration with subscription plans (Basic $10/month, Pro $50/month, Enterprise custom), usage-based overage charges ($0.01/minute), and monthly invoice generation with PDF export"
```

### "Plan doesn't match my architecture"
**Issue**: Generated plan suggests wrong technical approach
**Solution**: Provide architectural context:
```
/speckit.plan "Note: We use Flask for backend, not FastAPI. All database queries use SQLAlchemy ORM. Agents are deployed as separate processes, not containers."
```

### "Tasks are too large"
**Issue**: Tasks aren't granular enough
**Solution**: Ask for more granularity:
```
/speckit.tasks "Break tasks into smaller pieces - each task should take <4 hours"
```

---

## 📊 Example: Typical Development Session

### Morning: Plan New Feature
```bash
# You: I want to add webhooks so users can be notified when calls end
/speckit.specify "Add webhook system to notify users when calls complete, include call duration, cost, and transcript in webhook payload"

# Spec-kit: Creates spec, asks 2 clarification questions
# You: Answer questions

/speckit.plan
# Spec-kit: Generates technical plan

/speckit.tasks
# Spec-kit: Breaks into 12 tasks

# You: Review and approve
```

### Afternoon: Implement Feature
```bash
/speckit.implement
# Spec-kit: Starts implementing tasks in order
# - Creates webhook model
# - Adds webhook endpoints to Flask
# - Implements webhook delivery logic
# - Adds webhook UI to frontend
# - Writes tests
# - Updates documentation

# You: Review code, test locally, provide feedback
```

### Evening: Verify & Deploy
```bash
# Run tests
pytest -v

# Verify against constitution
# - Multi-tenant? ✅ Webhooks scoped by user_id
# - Tested? ✅ Unit and integration tests included
# - Observable? ✅ Webhook delivery logged

# Merge to main
git add .
git commit -m "feat: add webhook notification system"
git push
```

---

## 🎓 Learning Resources

### Spec-Kit Documentation
- **GitHub**: https://github.com/github/spec-kit
- **Guide**: See `.specify/templates/` for document templates

### Epic.ai Documentation
- **Constitution**: `.specify/memory/constitution.md`
- **Baseline Spec**: `.specify/BASELINE_SPEC.md`
- **Project State**: `.specify/PROJECT_STATE.md`
- **Main Codebase Guide**: `CLAUDE.md` (LiveKit Agents rules)

### LiveKit Agents Resources
- **Docs**: https://docs.livekit.io/agents
- **Examples**: `/opt/livekit1/examples/`
- **Voice Agents**: `/opt/livekit1/voice_agents/`

---

## 📞 Next Steps for Epic.ai

Based on your baseline spec, here are suggested priorities:

### High Priority (MVP Completion)
1. **Complete E2E Call Testing**
   ```
   /speckit.specify "Verify end-to-end call flow from phone number to agent response with comprehensive testing suite"
   ```

2. **Polish Frontend UI**
   ```
   /speckit.specify "Complete phone numbers management UI with number provisioning, assignment, and status indicators"
   ```

3. **Agent Deployment Automation**
   ```
   /speckit.specify "Set up systemd services for automatic agent process management with health monitoring and auto-restart"
   ```

### Medium Priority (Phase 2)
4. **Stripe Billing Integration**
   ```
   /speckit.specify "Complete Stripe integration with subscription plans, usage tracking, and invoice generation"
   ```

5. **Admin Dashboard**
   ```
   /speckit.specify "Build admin dashboard for user management, system statistics, and phone inventory management"
   ```

### Low Priority (Future)
6. **Agent Function Calling**
   ```
   /speckit.specify "Add custom function/tool calling support for agents to integrate with external APIs and databases"
   ```

7. **Webhooks System**
   ```
   /speckit.specify "Add webhook system for real-time event notifications to external systems"
   ```

---

## ✅ Your Project Is Ready!

You now have:
- ✅ Constitution defining principles
- ✅ Baseline spec documenting current state
- ✅ Spec-kit workflow for structured development
- ✅ 8 slash commands for feature development
- ✅ Security configuration (gitignore)

**Start building your next feature:**
```
/speckit.specify "Your feature description here"
```

Good luck building Epic.ai! 🚀
