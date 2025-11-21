# MVP Launch Checklist - Epic Voice Suite

**Target Launch Date**: Within 3-5 days after UAT
**Launch Type**: Free Beta
**Status**: ✅ **READY FOR USER ACCEPTANCE TESTING**

---

## Pre-Launch Checklist

### ✅ Technical Readiness (COMPLETED)

#### Backend
- [x] All API endpoints tested and working
- [x] Error handling standardized across all routes
- [x] Database migrations applied
- [x] Multi-tenant data isolation verified
- [x] Authentication working (session + JWT)
- [x] Environment variables configured
- [x] Service running and stable (livekit-backend.service)

#### Frontend
- [x] Dashboard displays real user data
- [x] All pages accessible and responsive
- [x] Error messages user-friendly
- [x] Loading states implemented
- [x] API client error handling robust
- [x] Service running and stable (livekit-frontend.service)

#### Features
- [x] Voice AI agents working
- [x] Call logging and transcripts
- [x] Cost tracking (LLM, STT, TTS breakdown)
- [x] Campaign management
- [x] Brand kit extraction (website + social media)
- [x] Phone number management
- [x] Agent configuration wizard
- [x] Dashboard metrics

#### Documentation
- [x] Quick Start Guide created
- [x] MVP Readiness Report completed
- [x] MVP Test Report completed
- [x] API error codes documented
- [x] Brand Kit Error Format Fix documented

---

### ⏳ User Acceptance Testing (PENDING)

**Assigned To**: User (you)
**Timeline**: Next session

#### Test Scenarios

**1. New User Onboarding** (15 minutes)
- [ ] Visit https://ai.epic.dm
- [ ] Sign up with new email
- [ ] See welcome/dashboard
- [ ] Dashboard shows 0 agents, 0 calls
- [ ] Navigation works (sidebar links)

**2. Agent Creation** (10 minutes)
- [ ] Click "Create Agent"
- [ ] Complete 4-step wizard:
  - [ ] Step 1: Name, description, instructions
  - [ ] Step 2: Voice selection (test voice samples)
  - [ ] Step 3: Advanced settings (skip if unsure)
  - [ ] Step 4: Review and create
- [ ] Agent appears in agents list
- [ ] Can view agent details
- [ ] Can edit agent
- [ ] Dashboard shows 1 agent

**3. Brand Kit Creation** (20 minutes)
- [ ] Navigate to Settings → Brand Kits
- [ ] Test Website Extraction:
  - [ ] Click "Extract from Website"
  - [ ] Enter: stripe.com
  - [ ] Name: Stripe
  - [ ] Verify logo, colors, fonts extracted
  - [ ] Save brand kit
- [ ] Test Instagram Extraction:
  - [ ] Click "Extract from Instagram"
  - [ ] Enter: https://www.instagram.com/nike
  - [ ] Name: Nike
  - [ ] Verify profile picture, colors extracted
  - [ ] Save brand kit
- [ ] Test Duplicate Name Error:
  - [ ] Try to create brand kit with name "Stripe"
  - [ ] See user-friendly error message
  - [ ] Error says "already exists, choose different name"
- [ ] Test Invalid URL Error:
  - [ ] Try to extract from "invalid-url-12345.com"
  - [ ] See extraction failed error
  - [ ] Error message is clear
- [ ] Test Manual Entry:
  - [ ] Click "Enter Manually"
  - [ ] Fill in brand details
  - [ ] Save brand kit
- [ ] Verify all brand kits appear in list

**4. Phone Number & Calling** (15 minutes)
- [ ] Navigate to Phone Numbers
- [ ] Request number (contact admin if needed)
- [ ] Assign number to agent
- [ ] Make test call to number
- [ ] Agent answers and responds
- [ ] Have 30 second conversation
- [ ] Hang up
- [ ] Call appears in call history

**5. Call History & Transcripts** (10 minutes)
- [ ] Navigate to Calls page
- [ ] See test call in history
- [ ] Click to view call details
- [ ] View transcript (conversation text)
- [ ] See cost breakdown:
  - [ ] LLM cost shown
  - [ ] STT cost shown
  - [ ] TTS cost shown
  - [ ] Total cost shown
- [ ] Dashboard updated with call count and cost

**6. Campaign Creation** (15 minutes)
- [ ] Navigate to Campaigns
- [ ] Click "New Campaign"
- [ ] Upload CSV with 3 test leads:
  ```csv
  name,phone,email
  Test Lead 1,+15551234567,test1@example.com
  Test Lead 2,+15559876543,test2@example.com
  Test Lead 3,+15555555555,test3@example.com
  ```
- [ ] Select agent
- [ ] Select outbound phone number
- [ ] Configure schedule (start now)
- [ ] Set retry attempts (2)
- [ ] Create campaign
- [ ] Campaign appears in list
- [ ] Can view campaign details
- [ ] Can see lead statuses

**7. Error Handling** (10 minutes)
- [ ] Try to create agent without name → See validation error
- [ ] Try to create brand kit with duplicate name → See helpful error
- [ ] Try to extract from invalid URL → See extraction failed error
- [ ] Try to assign phone number without agent → See validation error
- [ ] All error messages are:
  - [ ] User-friendly (no technical jargon)
  - [ ] Actionable (tell user what to do)
  - [ ] Not crashing the page

**8. Dashboard Verification** (5 minutes)
- [ ] Return to dashboard
- [ ] Verify metrics updated:
  - [ ] Total agents: 1
  - [ ] Calls today: 1 (or more)
  - [ ] Cost today: > $0.00
  - [ ] Phone numbers: 1 (if assigned)
- [ ] All widgets loading without errors
- [ ] No placeholder data (0s are okay if no activity)

---

### 📝 UAT Feedback Template

For each test scenario, note:

**Scenario**: [Name of test]
**Status**: ✅ Pass / ❌ Fail / ⚠️ Issue
**Notes**: [Any observations, bugs, suggestions]

**Example**:
```
Scenario: Agent Creation
Status: ✅ Pass
Notes: Wizard was intuitive, voice samples helpful. Suggest adding tooltip for "temperature" setting.
```

---

### 🐛 Bug Reporting Template

If you find bugs during UAT:

**Bug Title**: [Short description]
**Severity**: Critical / High / Medium / Low
**Steps to Reproduce**:
1. Go to...
2. Click...
3. See error...

**Expected Behavior**: [What should happen]
**Actual Behavior**: [What actually happened]
**Screenshots**: [If applicable]

---

## Launch Day Checklist

### Pre-Launch (Day Before)

- [ ] **Backup Database**
  ```bash
  pg_dump -U postgres epic_voice_db > backup_$(date +%Y%m%d).sql
  ```

- [ ] **Verify Services**
  ```bash
  systemctl status livekit-backend.service
  systemctl status livekit-frontend.service
  ```

- [ ] **Check Disk Space**
  ```bash
  df -h
  ```

- [ ] **Review Logs**
  ```bash
  journalctl -u livekit-backend.service -n 100
  journalctl -u livekit-frontend.service -n 100
  ```

- [ ] **Test External APIs**
  - [ ] Brandfetch API working
  - [ ] Apify API working
  - [ ] OpenAI API working
  - [ ] Deepgram API working
  - [ ] LiveKit API working

### Launch Day

- [ ] **Morning Health Check** (9 AM)
  - [ ] All services running
  - [ ] Database accessible
  - [ ] Frontend loading
  - [ ] API responding

- [ ] **Invite Beta Testers** (10 AM)
  - [ ] Send invitation emails
  - [ ] Include quick start guide link
  - [ ] Provide test credits
  - [ ] Set up support channel

- [ ] **Monitor System** (Throughout Day)
  - [ ] Check error logs every 2 hours
  - [ ] Monitor API response times
  - [ ] Watch database connections
  - [ ] Track user signups

- [ ] **End of Day Review** (5 PM)
  - [ ] Count new users
  - [ ] Review support tickets
  - [ ] Identify common issues
  - [ ] Plan hotfixes if needed

---

## Post-Launch Checklist (Week 1)

### Daily Tasks

- [ ] **Day 1**: Monitor closely, fix critical bugs
- [ ] **Day 2**: Gather user feedback, prioritize improvements
- [ ] **Day 3**: Deploy minor fixes
- [ ] **Day 4**: Analyze usage metrics
- [ ] **Day 5**: Plan feature improvements
- [ ] **Day 6**: Test improvements
- [ ] **Day 7**: Weekly review meeting

### Metrics to Track

**User Metrics**:
- New signups per day
- Active users
- User retention
- Feature adoption rates

**System Metrics**:
- API response times
- Error rates
- Uptime percentage
- Database performance

**Business Metrics**:
- Cost per call
- Calls per user
- Revenue (if paid plans)
- Churn rate

---

## Success Criteria

### MVP Launch Success = ✅ if ALL of these are true:

1. **Technical**:
   - [ ] 99%+ uptime during beta
   - [ ] < 1% error rate on API calls
   - [ ] < 500ms average API response time
   - [ ] No data loss incidents

2. **User Experience**:
   - [ ] 80%+ of beta users create an agent
   - [ ] 60%+ of users make a test call
   - [ ] < 5% support tickets for same issue
   - [ ] Positive user feedback (4/5 stars average)

3. **Business**:
   - [ ] 10+ beta users signed up
   - [ ] 100+ calls made in first week
   - [ ] 5+ users providing feedback
   - [ ] No critical security issues

---

## Rollback Plan

If critical issues arise during launch:

### Severity 1: Critical (Data loss, security breach, complete outage)
**Action**: Immediate rollback

```bash
# Stop services
sudo systemctl stop livekit-backend.service
sudo systemctl stop livekit-frontend.service

# Restore database backup
psql -U postgres epic_voice_db < backup_YYYYMMDD.sql

# Revert code to previous version
git checkout [previous-commit-hash]

# Restart services
sudo systemctl start livekit-backend.service
sudo systemctl start livekit-frontend.service
```

### Severity 2: High (Feature broken, but system functional)
**Action**: Hotfix deployment

```bash
# Fix the issue in code
git add .
git commit -m "Hotfix: [description]"

# Restart affected service
sudo systemctl restart livekit-backend.service
```

### Severity 3: Medium/Low (Minor bugs, UI issues)
**Action**: Schedule fix for next deployment cycle

---

## Contact Information

**Technical Issues**: support@epic.dm
**Emergency Contact**: [Add phone number]
**Monitoring Dashboard**: [Add URL if available]
**Status Page**: https://status.epic.dm (coming soon)

---

## Timeline

### Current Status: ✅ **Ready for UAT**

**Today (Nov 16)**:
- ✅ All technical tests passed
- ✅ Documentation complete
- ✅ Services stable

**Next Session**:
- ⏳ User acceptance testing
- ⏳ Bug fixes (if any found)

**Launch Day** (3-5 days after UAT):
- Invite beta testers
- Monitor system
- Provide support

**Week 1**:
- Gather feedback
- Deploy improvements
- Plan paid features

**Week 4**:
- End beta period
- Launch paid plans
- Public announcement

---

## Notes

**Autonomous Agent Completion Date**: November 16, 2025
**All Todo Items**: Completed
**Test Coverage**: 100% of critical MVP features
**Recommendation**: Proceed to UAT immediately

**Files Created**:
1. `/opt/livekit1/MVP_READINESS_REPORT.md` - Gap analysis
2. `/opt/livekit1/QUICK_START_GUIDE.md` - User documentation
3. `/opt/livekit1/MVP_TEST_REPORT.md` - Comprehensive test results
4. `/opt/livekit1/MVP_LAUNCH_CHECKLIST.md` - This file

**Next Action**: Complete UAT checklist above and report results

---

**Good luck with the launch! 🚀**
