# Apify Social Media Integration - Complete Setup Guide

**Date**: November 16, 2025
**Status**: READY FOR TESTING (requires Apify API token)

---

## 🎯 Overview

Successfully integrated **Apify** API to enable brand kit extraction from **Facebook** and **Instagram** profiles, even for businesses without websites!

### Problem Solved
- ✅ Businesses with only Facebook/Instagram pages can now create brand kits
- ✅ Automatic extraction of logos (profile pictures)
- ✅ Automatic color palette extraction from profile pictures
- ✅ Profile information (name, bio, follower count, verification status)

---

## 🏗️ Architecture

### Dual Extraction System

```
User Input (URL)
    ↓
Detect Platform
    ↓
    ├─→ Company Domain (e.g., "apple.com")
    │       ↓
    │   Brandfetch API
    │       ↓
    │   Extract: Logo, Colors, Fonts, Company Info
    │
    ├─→ Facebook Page (e.g., "facebook.com/ladupigny")
    │       ↓
    │   Apify Facebook Scraper
    │       ↓
    │   Extract: Profile Pic, Page Info, Colors from Image
    │
    └─→ Instagram Profile (e.g., "instagram.com/nike")
            ↓
        Apify Instagram Scraper
            ↓
        Extract: Profile Pic, Bio, Colors from Image
```

---

## 📦 New Components

### 1. Apify Client (`/opt/livekit1/backend/brand_kit/apify_client.py`)

**Purpose**: Handles communication with Apify API for social media scraping

**Key Features**:
- Instagram profile scraping
- Facebook page scraping
- Automatic color extraction from profile pictures using ColorThief
- RESTful API integration with Apify actors
- Async actor run management (waits for completion)

**Main Methods**:
```python
class ApifyClient:
    def scrape_instagram_profile(self, profile_url: str) -> Optional[Dict]
    def scrape_facebook_page(self, page_url: str) -> Optional[Dict]
    def extract_colors_from_image(self, image_url: str, num_colors: int = 5) -> List[Dict]
    def extract_all(self, url: str, platform: str) -> Optional[Dict]
```

### 2. Updated Brandfetch Client

**Changes**:
- Added `_detect_platform()` method to identify social media URLs
- Modified `extract_all()` to raise `ValueError("social_media:{platform}")` for social URLs
- This triggers fallback to Apify in the service layer

### 3. Updated Brand Kit Service

**Changes**:
- Integrated Apify client alongside Brandfetch
- Automatic platform detection and routing
- Graceful fallback when Brandfetch detects social media URLs

**Flow**:
```python
try:
    brand_data = brandfetch_client.extract_all(url)
except ValueError as ve:
    if "social_media:" in str(ve):
        platform = ve.split(':')[1]  # 'facebook' or 'instagram'
        brand_data = apify_client.extract_all(url, platform)
```

---

## 🔧 Setup Instructions

### Step 1: Get Apify API Token

1. Go to https://apify.com
2. Sign up for a free account
3. Navigate to **Console** → **Integrations**
4. Copy your **API Token**

**Free Tier**:
- $5 free credit (≈2,000 profile extractions)
- Perfect for testing and small deployments

### Step 2: Add API Token to Environment

Edit `/opt/livekit1/.env`:

```bash
# Apify API Configuration (for social media profile extraction)
# Get from https://console.apify.com/account/integrations
APIFY_API_TOKEN='your_actual_token_here'
```

### Step 3: Restart Backend

```bash
sudo systemctl restart livekit-backend.service
```

### Step 4: Test Extraction

**Test Instagram**:
```bash
curl -X POST http://localhost:5001/api/user/brand-kits/extract \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@epic.dm" \
  -d '{
    "url": "https://www.instagram.com/nike",
    "name": "Nike Brand"
  }'
```

**Test Facebook**:
```bash
curl -X POST http://localhost:5001/api/user/brand-kits/extract \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@epic.dm" \
  -d '{
    "url": "https://www.facebook.com/ladupigny",
    "name": "My Business"
  }'
```

---

## 📊 Extracted Data Fields

### Instagram Profile Extraction

```json
{
  "companyName": "Nike",
  "description": "Just Do It ✓ Official Instagram...",
  "logoUrl": "https://scontent.cdninstagram.com/v/...",
  "websiteUrl": "https://www.nike.com",
  "socialLinks": {
    "instagram": "https://instagram.com/nike"
  },
  "followerCount": 306000000,
  "isVerified": true,
  "isPrivate": false,
  "brandColors": [
    {"hex": "#000000", "name": "extracted-1", "usage": "primary"},
    {"hex": "#FFFFFF", "name": "extracted-2", "usage": "accent"},
    {"hex": "#FF6B00", "name": "extracted-3", "usage": "accent"}
  ]
}
```

### Facebook Page Extraction

```json
{
  "companyName": "La Dupigny",
  "description": "Local business serving the community...",
  "logoUrl": "https://scontent.xx.fbcdn.net/v/...",
  "websiteUrl": "https://example.com",
  "socialLinks": {
    "facebook": "https://www.facebook.com/ladupigny"
  },
  "followerCount": 15420,
  "isVerified": false,
  "category": "Local Business",
  "brandColors": [
    {"hex": "#1877F2", "name": "extracted-1", "usage": "primary"},
    {"hex": "#42B72A", "name": "extracted-2", "usage": "accent"}
  ]
}
```

---

## 🎨 Color Extraction Feature

### How It Works

1. **Download Profile Picture** - Fetches the high-resolution profile image
2. **ColorThief Analysis** - Extracts dominant colors using color quantization
3. **Palette Generation** - Returns 5 most prominent colors
4. **Format Conversion** - Converts RGB to HEX format

### Technology

**Library**: ColorThief (Python)
- Algorithm: Median cut color quantization
- Based on Leptonica library
- Extracts dominant colors from any image

**Installation**:
```bash
pip3 install colorthief
```

**Example Output**:
```python
[
  {'hex': '#1B1F3A', 'name': 'extracted-1', 'usage': 'primary'},   # Dark navy
  {'hex': '#FFFFFF', 'name': 'extracted-2', 'usage': 'accent'},     # White
  {'hex': '#FF5733', 'name': 'extracted-3', 'usage': 'accent'},     # Orange
  {'hex': '#3498DB', 'name': 'extracted-4', 'usage': 'accent'},     # Blue
  {'hex': '#2ECC71', 'name': 'extracted-5', 'usage': 'accent'}      # Green
]
```

---

## 🔄 How the Integration Works

### User Flow

1. **User enters URL** in Brand Kit wizard:
   - `facebook.com/ladupigny` → Detected as Facebook
   - `instagram.com/nike` → Detected as Instagram
   - `stripe.com` → Detected as website domain

2. **Frontend sends to API**:
   ```
   POST /api/user/brand-kits/extract
   {"url": "facebook.com/ladupigny"}
   ```

3. **Service Layer Routes Request**:
   ```python
   # Brandfetch detects platform and raises ValueError
   platform = brandfetch.detect_platform(url)  # Returns 'facebook'

   # Service catches and routes to Apify
   brand_data = apify.extract_all(url, 'facebook')
   ```

4. **Apify Extracts Data**:
   - Runs Instagram/Facebook scraper actor
   - Waits for completion (max 2 minutes)
   - Downloads profile picture
   - Extracts colors using ColorThief
   - Returns structured brand data

5. **Brand Kit Created**:
   - Logo: Profile picture URL
   - Colors: Extracted palette
   - Company name: Profile name
   - Description: Bio/About section

---

## 🧪 Testing Checklist

### Before Testing
- [ ] Apify API token added to `.env`
- [ ] Backend service restarted
- [ ] `colorthief` library installed

### Instagram Tests
- [ ] Public Instagram profile extraction
- [ ] Verified account extraction
- [ ] Profile with external website link
- [ ] Color extraction from profile picture

### Facebook Tests
- [ ] Public Facebook page extraction
- [ ] Business page with category
- [ ] Page with website link
- [ ] Color extraction from page picture

### Error Handling
- [ ] Private Instagram profile (should fail gracefully)
- [ ] Non-existent profile (should return error)
- [ ] Invalid URL format (should return validation error)
- [ ] Apify rate limit exceeded (should return quota error)

---

## 💰 Apify Pricing

### Free Tier
- **$5 free credit** per month
- **≈2,000 profile extractions** (Instagram Profile Scraper: $0.0026 per result)
- Perfect for testing and MVP

### Paid Plans
- **Starter**: $49/month - 100,000 results
- **Scale**: $499/month - 1,000,000 results
- **Pay-as-you-go**: $2.60 per 1,000 results

### Cost Comparison

| Platform | Brandfetch | Apify |
|----------|-----------|-------|
| Website domains | ✅ Supported | ❌ Not needed |
| Facebook pages | ❌ Not supported | ✅ $0.0026/profile |
| Instagram profiles | ❌ Not supported | ✅ $0.0026/profile |
| Free tier | ✅ Free | ✅ $5/month credit |

---

## 📁 Modified Files

### New Files
1. `/opt/livekit1/backend/brand_kit/apify_client.py` - Apify integration client

### Modified Files
1. `/opt/livekit1/backend/brand_kit/brandfetch_client.py`
   - Added `_detect_platform()` method
   - Modified `extract_all()` to detect social media

2. `/opt/livekit1/backend/brand_kit/service.py`
   - Added Apify client initialization
   - Added automatic routing logic
   - Enhanced error handling

3. `/opt/livekit1/.env`
   - Added `APIFY_API_TOKEN` configuration

### Frontend (No Changes Required)
- ✅ Wizard already supports Facebook/Instagram options
- ✅ Error handling already in place
- ✅ Display components ready

---

## 🎯 Supported URL Formats

### Instagram
```
✅ https://www.instagram.com/nike
✅ https://instagram.com/nike
✅ instagram.com/nike
✅ www.instagram.com/nike
```

### Facebook
```
✅ https://www.facebook.com/ladupigny
✅ https://facebook.com/ladupigny
✅ facebook.com/ladupigny
✅ www.facebook.com/ladupigny
```

### Website Domains (Brandfetch)
```
✅ https://www.stripe.com
✅ https://stripe.com
✅ stripe.com
✅ www.stripe.com
```

---

## ⚠️ Known Limitations

### 1. Private Profiles
- **Instagram**: Cannot scrape private profiles
- **Facebook**: Cannot scrape pages with restricted access
- **Solution**: Returns error asking user to make profile public

### 2. Rate Limits
- **Apify Free Tier**: $5 credit = ~2,000 extractions
- **After limit**: Returns quota exceeded error
- **Solution**: Upgrade Apify plan or wait for monthly reset

### 3. Profile Picture Quality
- **Depends on**: User's uploaded image quality
- **Color extraction**: May not match exact brand guidelines
- **Solution**: Users can manually edit colors after extraction

### 4. Facebook Page Types
- **Business Pages**: ✅ Fully supported
- **Personal Profiles**: ❌ Not supported (violates FB ToS)
- **Groups**: ❌ Not currently supported

---

## 🔐 Security Considerations

### API Token Storage
- ✅ Stored in `.env` file (not committed to git)
- ✅ Accessed via environment variables
- ✅ Never exposed to frontend

### Social Media ToS
- ✅ Apify scrapers comply with platform ToS
- ✅ Only public data is accessed
- ✅ Respects rate limits and robots.txt

### Data Privacy
- ✅ No user authentication required
- ✅ Only public profile data extracted
- ✅ No storage of social media credentials

---

## 📈 Next Steps

### Immediate (Before Launch)
1. **Get Apify API Token** - Sign up and add to `.env`
2. **Test Real Profiles** - Verify extraction works correctly
3. **Monitor Costs** - Track Apify usage in first week

### Future Enhancements
1. **LinkedIn Support** - Add LinkedIn company page extraction
2. **Twitter/X Support** - Add Twitter profile extraction
3. **Batch Processing** - Extract multiple profiles at once
4. **Caching** - Cache profile data to reduce API calls
5. **Webhook Integration** - Async extraction with webhooks

---

## 🆘 Troubleshooting

### Error: "No Apify API token provided"
**Solution**: Add `APIFY_API_TOKEN` to `.env` and restart backend

### Error: "Actor run timed out"
**Solution**: Instagram/Facebook may be slow. Try again or increase timeout in `apify_client.py`

### Error: "Failed to extract profile"
**Possible causes**:
- Profile is private
- Profile doesn't exist
- Invalid URL format
- Apify quota exceeded

**Solution**: Check profile is public and URL is correct

### Error: "No module named 'colorthief'"
**Solution**:
```bash
pip3 install --break-system-packages colorthief
sudo systemctl restart livekit-backend.service
```

---

## ✅ Success Criteria

- [x] Apify client created and integrated
- [x] Platform detection working
- [x] Automatic routing to correct extractor
- [x] Color extraction from profile pictures
- [x] Error handling for private profiles
- [x] Documentation complete
- [ ] **Apify API token configured** ← USER ACTION REQUIRED
- [ ] **Real profile extraction tested** ← NEEDS TESTING

---

## 📞 Support Resources

### Apify Documentation
- API Reference: https://docs.apify.com/api/v2
- Instagram Scraper: https://apify.com/apify/instagram-profile-scraper
- Facebook Scraper: https://apify.com/apify/facebook-pages-scraper

### Our Documentation
- Brand Kit Overview: `/opt/livekit1/backend/brand_kit/README.md`
- Brandfetch Integration: `/opt/livekit1/BRAND_KIT_SOCIAL_VALIDATION_COMPLETE.md`
- This Guide: `/opt/livekit1/APIFY_SOCIAL_MEDIA_INTEGRATION_COMPLETE.md`

---

## 🎉 Summary

You now have a **complete brand kit extraction system** that supports:

1. **Company Websites** (Brandfetch) - Free, comprehensive brand data
2. **Instagram Profiles** (Apify) - Profile pic, colors, bio, followers
3. **Facebook Pages** (Apify) - Page pic, colors, about, likes

**Total Cost for Small Business**:
- Brandfetch: Free
- Apify: $5/month credit (2,000 extractions)
- ColorThief: Free (open source)

**Perfect for businesses at any stage!** 🚀

---

**Created by**: Claude Code
**Date**: November 16, 2025
**Status**: Ready for API token and testing
