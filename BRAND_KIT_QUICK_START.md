# Brand Kit System - Quick Start Guide

## ✅ System Status: READY!

**Brandfetch API Key**: Configured and working ✅
**Backend**: Running with brand kit support ✅
**Frontend**: Built with Brand Kits navigation link ✅
**Database**: Migration applied ✅

---

## 🎨 How to Create a Brand Kit

### Option 1: Auto-Extract from Website (Recommended)

1. **Navigate to Brand Kits**
   - Go to dashboard at: `https://ai.epic.dm/dashboard`
   - Click "Brand Kits" in the sidebar (palette icon)

2. **Create New Brand Kit**
   - Click "+ Create Brand Kit" button
   - Choose extraction source:
     - **Extract from Website** - Company website (most accurate)
     - **Extract from Facebook Page** - Facebook business page
     - **Extract from Instagram** - Instagram profile

3. **Enter URL**
   - **Website**: Type domain (e.g., `apple.com`, `yourcompany.com`)
   - **Facebook**: Enter page URL (e.g., `facebook.com/yourpage`)
   - **Instagram**: Enter profile URL (e.g., `instagram.com/yourprofile`)
   - Optionally name it (or leave blank to auto-detect)
   - Check "Set as default" for your primary brand

4. **Extract Brand**
   - Click "Extract Brand" button
   - System automatically fetches:
     - Company logo (PNG + SVG)
     - Brand colors (primary, accent, etc.)
     - Typography (font families)
     - Company information
     - Social media links

5. **Review & Customize**
   - Review extracted colors
   - Add/remove/edit colors as needed
   - Preview how it looks

6. **Save**
   - Click "Create Brand Kit"
   - Your brand kit is now available for use!

### Option 2: Manual Entry

1. Navigate to Brand Kits → Create Brand Kit
2. Select "Enter Manually"
3. Fill in:
   - Brand kit name
   - Company name
   - Logo URL
   - Brand colors (add multiple)
4. Click "Create Brand Kit"

---

## 🚀 Using Brand Kits in Funnels

### When Creating Landing Pages

1. **Create New Funnel**
   - Go to Funnels → Create Funnel
   - Select "Landing Page" as trigger

2. **Select Brand Kit**
   - In the Landing Page configuration step
   - You'll see "Brand Kit (Optional)" selector
   - Choose your brand kit from dropdown
   - Your default brand kit will be pre-selected

3. **Watch Magic Happen**
   - Colors automatically populate from brand kit
   - Primary color → Main gradient/buttons
   - Accent color → Secondary elements
   - You can still customize if needed

4. **Create Funnel**
   - Save the funnel
   - Landing page will use your brand colors!

---

## 📊 Managing Brand Kits

### View All Brand Kits
- Navigate to `/dashboard/settings/brand-kits`
- See grid of all your brand kits
- Visual previews with logos, colors, fonts

### Set Default Brand Kit
- Click "Set Default" on any brand kit
- Default kit auto-selected when creating funnels
- Only one default per account

### Edit Brand Kit
- Click "Edit" on brand kit card
- Update colors, logo, information
- Save changes

### Refresh Brand Kit
- For website-extracted kits
- Click "Refresh" to re-extract latest branding
- Updates logo, colors, fonts from source

### Delete Brand Kit
- Click "Delete" on brand kit card
- Confirms before deletion
- Can't delete if in use by active funnels

---

## 🎯 Examples to Try

### Test the System

```bash
# Test extraction from websites:
1. Apple: apple.com
2. Nike: nike.com
3. Coca-Cola: coca-cola.com
4. Airbnb: airbnb.com
5. Stripe: stripe.com

# Test extraction from social media:
1. Facebook Page: facebook.com/nike
2. Instagram: instagram.com/nike
3. Facebook Page: facebook.com/cocacola
4. Instagram: instagram.com/starbucks

# Then create a funnel and see how the brand colors apply!
```

---

## 🔧 Technical Details

### API Endpoints Available

```
GET    /api/user/brand-kits              # List all
GET    /api/user/brand-kits/:id          # Get one
GET    /api/user/brand-kits/default      # Get default
POST   /api/user/brand-kits              # Create manual
POST   /api/user/brand-kits/extract      # Extract from website
PUT    /api/user/brand-kits/:id          # Update
DELETE /api/user/brand-kits/:id          # Delete
POST   /api/user/brand-kits/:id/set-default
POST   /api/user/brand-kits/:id/refresh
```

### Brandfetch API Info
- **Provider**: Brandfetch.com
- **Coverage**: 20M+ company brands
- **API Key**: Configured in `/opt/livekit1/.env`
- **Free Tier**: 100 requests/month
- **Upgrade**: $49/month for 2,500 requests

### Database
- **Table**: `brand_kits`
- **Storage**: PostgreSQL with JSONB for colors/fonts
- **Relationships**: Referenced by `funnels.brandKitId`

---

## 🐛 Troubleshooting

### Brand Extraction Fails
- **Check**: Website domain is correct (no http://, just domain)
- **Check**: Company exists in Brandfetch database
- **Fallback**: Use manual entry if extraction fails

### Colors Not Appearing on Landing Page
- **Check**: Brand kit is selected in funnel creation
- **Check**: Funnel was saved after selecting brand kit
- **Fix**: Edit funnel, re-select brand kit, save

### "No Brand Kits Found"
- **Action**: Create your first brand kit
- **Tip**: Start with website extraction for fastest setup

---

## 📈 Best Practices

1. **Create Default Brand Kit First**
   - Set up your primary brand
   - Will auto-apply to all new funnels

2. **Use Website Extraction**
   - Fastest and most accurate
   - Gets official brand assets
   - Auto-updates with Refresh

3. **Test Landing Page**
   - After creating funnel with brand kit
   - Visit the landing page URL
   - Verify colors match your brand

4. **Multiple Brands for Agencies**
   - Create separate brand kit for each client
   - Select appropriate brand per funnel
   - Keep branding consistent across campaigns

---

## 🎉 What You Can Do Now

✅ **Extract brand from any website** (20M+ companies)
✅ **Auto-apply colors to landing pages**
✅ **Manage multiple brand kits** (great for agencies)
✅ **Set default brand** for automatic selection
✅ **Refresh brand assets** from source websites
✅ **Preview brand kits** before using
✅ **Consistent branding** across all funnels

---

## 🔮 Coming Soon

Future enhancements planned:
- Brand kit templates marketplace
- AI color generation from logo
- Direct logo upload (vs URL only)
- Apply to email templates
- Apply to SMS messages
- Apply to agent avatars
- Team brand kit sharing
- Brand kit analytics

---

**Ready to create your first brand kit?** 🚀

Go to: `https://ai.epic.dm/dashboard/settings/brand-kits`

Built with ❤️ - November 16, 2025
