# White-Label Infrastructure MVP - Implementation Plan

**Timeline**: 6 weeks
**Investment**: $40K-$60K
**Expected ROI**: 10-20x within 12 months
**Target**: Launch with 3-5 pilot partners by Week 8

---

## 🎯 Product Vision

Transform Epic Voice from an **end-user product** into a **white-label infrastructure platform** that agencies, CRM platforms, and vertical SaaS can rebrand and resell.

**Key Principles**:
- Partners see it as **their product**, not yours
- **Zero Epic branding** in partner-facing interfaces
- **Seamless embedding** into partner platforms
- **Self-service** for technical teams

---

## Week 1-2: White-Label Dashboard Features

### 1.1 Custom Domain Support

**Goal**: Partners can use their own domain (partner.com) instead of ai.epic.dm

**Database Changes**:
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN custom_domain VARCHAR(255);
ALTER TABLE users ADD COLUMN domain_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN domain_verification_token VARCHAR(255);

-- New table for domain configuration
CREATE TABLE partner_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(255) UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  ssl_enabled BOOLEAN DEFAULT FALSE,
  ssl_certificate TEXT,
  ssl_private_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

CREATE INDEX idx_partner_domains_domain ON partner_domains(domain);
CREATE INDEX idx_partner_domains_user_id ON partner_domains(user_id);
```

**Backend Implementation**:
```python
# /opt/livekit1/user_dashboard.py

@app.route('/api/user/white-label/domain', methods=['POST'])
def configure_custom_domain():
    """
    Configure custom domain for white-label partner
    Returns DNS records needed for verification
    """
    data = request.get_json()
    domain = data.get('domain')

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)

    # Save domain configuration
    cursor.execute("""
        INSERT INTO partner_domains (user_id, domain, verification_token)
        VALUES (%s, %s, %s)
        ON CONFLICT (domain) DO UPDATE
        SET verification_token = %s
        RETURNING id
    """, (user_id, domain, verification_token, verification_token))

    # Return DNS records for partner to configure
    return jsonify({
        'domain': domain,
        'dns_records': [
            {
                'type': 'CNAME',
                'name': domain,
                'value': 'ai.epic.dm',
                'ttl': 3600
            },
            {
                'type': 'TXT',
                'name': f'_epic_verify.{domain}',
                'value': verification_token,
                'ttl': 3600
            }
        ],
        'verification_url': f'/api/user/white-label/domain/verify/{domain}'
    })

@app.route('/api/user/white-label/domain/verify/<domain>', methods=['POST'])
def verify_custom_domain(domain):
    """
    Verify domain ownership by checking TXT record
    """
    import dns.resolver

    # Get verification token from database
    cursor.execute("""
        SELECT verification_token
        FROM partner_domains
        WHERE domain = %s AND user_id = %s
    """, (domain, user_id))

    result = cursor.fetchone()
    if not result:
        return jsonify({'error': 'Domain not found'}), 404

    expected_token = result[0]

    # Check TXT record
    try:
        txt_records = dns.resolver.resolve(f'_epic_verify.{domain}', 'TXT')
        for record in txt_records:
            if str(record).strip('"') == expected_token:
                # Mark domain as verified
                cursor.execute("""
                    UPDATE partner_domains
                    SET verified = TRUE, verified_at = CURRENT_TIMESTAMP
                    WHERE domain = %s AND user_id = %s
                """, (domain, user_id))

                return jsonify({
                    'verified': True,
                    'message': 'Domain verified successfully'
                })
    except Exception as e:
        return jsonify({
            'verified': False,
            'error': str(e)
        }), 400

    return jsonify({
        'verified': False,
        'error': 'Verification TXT record not found'
    }), 400
```

**Frontend Implementation**:
```tsx
// /opt/livekit1/frontend/app/dashboard/white-label/domain/page.tsx

export default function CustomDomainPage() {
  const [domain, setDomain] = useState('');
  const [dnsRecords, setDnsRecords] = useState(null);
  const [verified, setVerified] = useState(false);

  const handleConfigureDomain = async () => {
    const res = await api.post('/api/user/white-label/domain', { domain });
    setDnsRecords(res.dns_records);
  };

  const handleVerifyDomain = async () => {
    const res = await api.post(`/api/user/white-label/domain/verify/${domain}`);
    setVerified(res.verified);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Custom Domain Setup</h1>

      {/* Step 1: Enter Domain */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">1. Enter Your Domain</h2>
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="voice.yourcompany.com"
          className="mb-4"
        />
        <Button onClick={handleConfigureDomain}>
          Configure Domain
        </Button>
      </div>

      {/* Step 2: DNS Records */}
      {dnsRecords && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">2. Add DNS Records</h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            {dnsRecords.map((record, i) => (
              <div key={i} className="mb-4 font-mono text-sm">
                <div><strong>Type:</strong> {record.type}</div>
                <div><strong>Name:</strong> {record.name}</div>
                <div><strong>Value:</strong> {record.value}</div>
                <div><strong>TTL:</strong> {record.ttl}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Verify */}
      {dnsRecords && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">3. Verify Domain</h2>
          <Button onClick={handleVerifyDomain} color="primary">
            Verify Domain
          </Button>
          {verified && (
            <div className="mt-4 text-green-600">
              ✅ Domain verified successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### 1.2 Rebrandable UI System

**Goal**: Partners can customize logo, colors, and branding

**Database Changes**:
```sql
-- Add branding configuration to users table
ALTER TABLE users ADD COLUMN branding_config JSONB DEFAULT '{
  "logo_url": null,
  "primary_color": "#0070f3",
  "secondary_color": "#7928ca",
  "accent_color": "#ff0080",
  "company_name": null,
  "support_email": null,
  "support_url": null
}'::jsonb;
```

**Backend API**:
```python
@app.route('/api/user/white-label/branding', methods=['GET', 'PUT'])
def manage_branding():
    """
    Get or update white-label branding configuration
    """
    if request.method == 'GET':
        cursor.execute("""
            SELECT branding_config FROM users WHERE id = %s
        """, (user_id,))
        result = cursor.fetchone()
        return jsonify(result[0] if result else {})

    elif request.method == 'PUT':
        data = request.get_json()

        # Validate colors
        if 'primary_color' in data:
            if not re.match(r'^#[0-9A-Fa-f]{6}$', data['primary_color']):
                return jsonify({'error': 'Invalid color format'}), 400

        cursor.execute("""
            UPDATE users
            SET branding_config = %s
            WHERE id = %s
        """, (json.dumps(data), user_id))

        return jsonify({'success': True})

@app.route('/api/user/white-label/logo', methods=['POST'])
def upload_logo():
    """
    Upload partner logo (store in S3 or local storage)
    """
    if 'logo' not in request.files:
        return jsonify({'error': 'No logo file'}), 400

    logo = request.files['logo']

    # Validate file type
    if not logo.filename.endswith(('.png', '.jpg', '.jpeg', '.svg')):
        return jsonify({'error': 'Invalid file type'}), 400

    # Save to storage (implement S3 or local storage)
    logo_url = save_logo(user_id, logo)

    # Update branding config
    cursor.execute("""
        UPDATE users
        SET branding_config = jsonb_set(
            branding_config,
            '{logo_url}',
            %s::jsonb
        )
        WHERE id = %s
    """, (json.dumps(logo_url), user_id))

    return jsonify({'logo_url': logo_url})
```

**Frontend Theme Provider**:
```tsx
// /opt/livekit1/frontend/contexts/BrandingContext.tsx

interface BrandingConfig {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_name?: string;
  support_email?: string;
  support_url?: string;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);

  useEffect(() => {
    // Fetch branding config from API
    api.get('/api/user/white-label/branding').then(setBranding);
  }, []);

  // Apply CSS variables for theming
  useEffect(() => {
    if (branding) {
      document.documentElement.style.setProperty('--color-primary', branding.primary_color);
      document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
      document.documentElement.style.setProperty('--color-accent', branding.accent_color);
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}
```

**Branding Settings Page**:
```tsx
// /opt/livekit1/frontend/app/dashboard/white-label/branding/page.tsx

export default function BrandingPage() {
  const { branding, setBranding } = useBranding();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">White-Label Branding</h1>

      {/* Logo Upload */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Company Logo</h2>
        <FileUpload
          accept=".png,.jpg,.svg"
          onUpload={async (file) => {
            const formData = new FormData();
            formData.append('logo', file);
            const res = await api.post('/api/user/white-label/logo', formData);
            setBranding({ ...branding, logo_url: res.logo_url });
          }}
        />
        {branding?.logo_url && (
          <img src={branding.logo_url} alt="Logo" className="mt-4 h-16" />
        )}
      </div>

      {/* Color Picker */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Brand Colors</h2>
        <div className="grid grid-cols-3 gap-4">
          <ColorPicker
            label="Primary Color"
            value={branding?.primary_color}
            onChange={(color) => setBranding({ ...branding, primary_color: color })}
          />
          <ColorPicker
            label="Secondary Color"
            value={branding?.secondary_color}
            onChange={(color) => setBranding({ ...branding, secondary_color: color })}
          />
          <ColorPicker
            label="Accent Color"
            value={branding?.accent_color}
            onChange={(color) => setBranding({ ...branding, accent_color: color })}
          />
        </div>
      </div>

      {/* Company Info */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Company Information</h2>
        <Input
          label="Company Name"
          value={branding?.company_name}
          onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
        />
        <Input
          label="Support Email"
          type="email"
          value={branding?.support_email}
          onChange={(e) => setBranding({ ...branding, support_email: e.target.value })}
        />
        <Input
          label="Support URL"
          type="url"
          value={branding?.support_url}
          onChange={(e) => setBranding({ ...branding, support_url: e.target.value })}
        />
      </div>

      <Button onClick={async () => {
        await api.put('/api/user/white-label/branding', branding);
        toast.success('Branding updated successfully');
      }}>
        Save Branding
      </Button>
    </div>
  );
}
```

---

### 1.3 Embedded Widget Code Generator

**Goal**: Generate embed code for partners to add voice agents to their websites

**Backend API**:
```python
@app.route('/api/user/white-label/embed-code', methods=['GET'])
def generate_embed_code():
    """
    Generate embeddable widget code for partner websites
    """
    # Get user's API key
    cursor.execute("""
        SELECT api_key FROM users WHERE id = %s
    """, (user_id,))
    api_key = cursor.fetchone()[0]

    # Get custom domain or use default
    cursor.execute("""
        SELECT domain FROM partner_domains
        WHERE user_id = %s AND verified = TRUE
        LIMIT 1
    """, (user_id,))
    result = cursor.fetchone()
    domain = result[0] if result else 'ai.epic.dm'

    # Generate embed code
    embed_code = f"""
<!-- Epic Voice AI Widget -->
<script src="https://{domain}/embed/widget.js"></script>
<script>
  EpicVoice.init({{
    apiKey: '{api_key}',
    position: 'bottom-right',
    theme: 'auto'
  }});
</script>
"""

    return jsonify({
        'embed_code': embed_code,
        'preview_url': f'https://{domain}/embed/preview?key={api_key}'
    })
```

**Widget JavaScript SDK**:
```javascript
// /opt/livekit1/frontend/public/embed/widget.js

(function() {
  'use strict';

  window.EpicVoice = {
    init: function(config) {
      const { apiKey, position = 'bottom-right', theme = 'auto' } = config;

      // Create widget container
      const widget = document.createElement('div');
      widget.id = 'epic-voice-widget';
      widget.style.position = 'fixed';
      widget.style.zIndex = '9999';

      // Position widget
      if (position === 'bottom-right') {
        widget.style.bottom = '20px';
        widget.style.right = '20px';
      } else if (position === 'bottom-left') {
        widget.style.bottom = '20px';
        widget.style.left = '20px';
      }

      // Create iframe for widget UI
      const iframe = document.createElement('iframe');
      iframe.src = `https://ai.epic.dm/embed/widget.html?key=${apiKey}&theme=${theme}`;
      iframe.style.border = 'none';
      iframe.style.width = '400px';
      iframe.style.height = '600px';
      iframe.style.borderRadius = '12px';
      iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

      widget.appendChild(iframe);
      document.body.appendChild(widget);

      // Handle messages from iframe
      window.addEventListener('message', (event) => {
        if (event.data.type === 'epic-voice-call-started') {
          console.log('Voice call started:', event.data.callId);
        }
      });
    }
  };
})();
```

**Frontend Embed Code Generator Page**:
```tsx
// /opt/livekit1/frontend/app/dashboard/white-label/embed/page.tsx

export default function EmbedCodePage() {
  const [embedCode, setEmbedCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/api/user/white-label/embed-code').then((res) => {
      setEmbedCode(res.embed_code);
      setPreviewUrl(res.preview_url);
    });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Embed Code Generator</h1>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Widget Code</h2>
        <p className="text-sm text-gray-600 mb-4">
          Copy this code and paste it into your website's HTML, just before the closing &lt;/body&gt; tag.
        </p>

        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code>{embedCode}</code>
          </pre>
          <Button
            onClick={handleCopy}
            className="absolute top-2 right-2"
            size="sm"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
        <iframe
          src={previewUrl}
          className="w-full h-[600px] border rounded-lg"
          title="Widget Preview"
        />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Customization Options</h2>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Position">
            <SelectItem key="bottom-right">Bottom Right</SelectItem>
            <SelectItem key="bottom-left">Bottom Left</SelectItem>
            <SelectItem key="top-right">Top Right</SelectItem>
            <SelectItem key="top-left">Top Left</SelectItem>
          </Select>
          <Select label="Theme">
            <SelectItem key="auto">Auto (System)</SelectItem>
            <SelectItem key="light">Light</SelectItem>
            <SelectItem key="dark">Dark</SelectItem>
          </Select>
        </div>
      </div>
    </div>
  );
}
```

---

## Week 3-4: Partner Portal

### 2.1 Partner Account Management

**Goal**: Tiered partner accounts with different capabilities

**Database Changes**:
```sql
-- Partner tiers
CREATE TYPE partner_tier AS ENUM ('agency', 'platform', 'enterprise');

ALTER TABLE users ADD COLUMN partner_tier partner_tier;
ALTER TABLE users ADD COLUMN partner_limits JSONB DEFAULT '{
  "max_concurrent_calls": 50,
  "monthly_minutes": 10000,
  "max_agents": 10,
  "max_phone_numbers": 5
}'::jsonb;

-- Partner usage tracking
CREATE TABLE partner_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partner_usage_user_date ON partner_usage(user_id, date);
```

**Backend API**:
```python
@app.route('/api/user/white-label/tier', methods=['GET'])
def get_partner_tier():
    """
    Get partner tier and limits
    """
    cursor.execute("""
        SELECT partner_tier, partner_limits
        FROM users
        WHERE id = %s
    """, (user_id,))

    result = cursor.fetchone()
    return jsonify({
        'tier': result[0],
        'limits': result[1]
    })

@app.route('/api/user/white-label/usage', methods=['GET'])
def get_partner_usage():
    """
    Get partner usage statistics
    """
    # Get date range from query params
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    cursor.execute("""
        SELECT
            date,
            total_calls,
            total_minutes,
            total_cost
        FROM partner_usage
        WHERE user_id = %s
          AND date BETWEEN %s AND %s
        ORDER BY date DESC
    """, (user_id, start_date, end_date))

    usage = cursor.fetchall()

    return jsonify({
        'usage': [
            {
                'date': row[0],
                'calls': row[1],
                'minutes': row[2],
                'cost': float(row[3])
            }
            for row in usage
        ]
    })
```

---

### 2.2 Usage Analytics Dashboard

**Frontend Implementation**:
```tsx
// /opt/livekit1/frontend/app/dashboard/white-label/analytics/page.tsx

export default function PartnerAnalyticsPage() {
  const [usage, setUsage] = useState([]);
  const [tier, setTier] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: new Date()
  });

  useEffect(() => {
    // Fetch tier info
    api.get('/api/user/white-label/tier').then(setTier);

    // Fetch usage data
    api.get('/api/user/white-label/usage', {
      params: {
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd')
      }
    }).then(setUsage);
  }, [dateRange]);

  const totalCalls = usage.reduce((sum, day) => sum + day.calls, 0);
  const totalMinutes = usage.reduce((sum, day) => sum + day.minutes, 0);
  const totalCost = usage.reduce((sum, day) => sum + day.cost, 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Partner Analytics</h1>

      {/* Tier Info */}
      <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          {tier?.tier.toUpperCase()} Tier
        </h2>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600">Max Concurrent Calls</p>
            <p className="text-2xl font-bold">{tier?.limits.max_concurrent_calls}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Monthly Minutes</p>
            <p className="text-2xl font-bold">{tier?.limits.monthly_minutes.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Max Agents</p>
            <p className="text-2xl font-bold">{tier?.limits.max_agents}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Max Phone Numbers</p>
            <p className="text-2xl font-bold">{tier?.limits.max_phone_numbers}</p>
          </div>
        </div>
      </div>

      {/* Usage Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Total Calls</p>
            <p className="text-3xl font-bold">{totalCalls.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Total Minutes</p>
            <p className="text-3xl font-bold">{totalMinutes.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-600">Total Cost</p>
            <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
          </CardBody>
        </Card>
      </div>

      {/* Usage Chart */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Usage Over Time</h2>
        <LineChart
          data={usage}
          xKey="date"
          yKeys={['calls', 'minutes']}
          height={300}
        />
      </div>

      {/* Usage Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Daily Usage</h2>
        <Table>
          <TableHeader>
            <TableColumn>Date</TableColumn>
            <TableColumn>Calls</TableColumn>
            <TableColumn>Minutes</TableColumn>
            <TableColumn>Cost</TableColumn>
          </TableHeader>
          <TableBody>
            {usage.map((day) => (
              <TableRow key={day.date}>
                <TableCell>{format(new Date(day.date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{day.calls}</TableCell>
                <TableCell>{day.minutes}</TableCell>
                <TableCell>${day.cost.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

---

### 2.3 API Key Management

**Database Changes**:
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

**Backend API**:
```python
import hashlib
import secrets

@app.route('/api/user/white-label/api-keys', methods=['GET', 'POST'])
def manage_api_keys():
    """
    List or create API keys
    """
    if request.method == 'GET':
        cursor.execute("""
            SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
            FROM api_keys
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        keys = cursor.fetchall()
        return jsonify({
            'keys': [
                {
                    'id': row[0],
                    'name': row[1],
                    'prefix': row[2],
                    'created_at': row[3],
                    'last_used_at': row[4],
                    'revoked': row[5] is not None
                }
                for row in keys
            ]
        })

    elif request.method == 'POST':
        data = request.get_json()
        name = data.get('name')

        # Generate API key: epic_live_xxxxxxxxxxxxxxxx
        key = f"epic_live_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        key_prefix = key[:15] + '...'

        cursor.execute("""
            INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (user_id, name, key_hash, key_prefix))

        key_id = cursor.fetchone()[0]

        return jsonify({
            'id': key_id,
            'key': key,  # Only returned once!
            'prefix': key_prefix
        })

@app.route('/api/user/white-label/api-keys/<key_id>', methods=['DELETE'])
def revoke_api_key(key_id):
    """
    Revoke an API key
    """
    cursor.execute("""
        UPDATE api_keys
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE id = %s AND user_id = %s
    """, (key_id, user_id))

    return jsonify({'success': True})
```

---

## Week 5-6: Developer SDK & Documentation

### 3.1 JavaScript SDK

**Implementation**:
```javascript
// /opt/livekit1/sdk/javascript/epic-voice.js

class EpicVoiceClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://ai.epic.dm/api/v1';
  }

  async createAgent(config) {
    const response = await fetch(`${this.baseUrl}/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  async makeCall(phoneNumber, agentId) {
    const response = await fetch(`${this.baseUrl}/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        agent_id: agentId
      })
    });
    return response.json();
  }

  async getCallLogs(options = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(`${this.baseUrl}/calls?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    return response.json();
  }
}

export default EpicVoiceClient;
```

**NPM Package**:
```json
// /opt/livekit1/sdk/javascript/package.json
{
  "name": "@epic-voice/sdk",
  "version": "1.0.0",
  "description": "JavaScript SDK for Epic Voice AI Platform",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "keywords": ["voice", "ai", "telephony"],
  "author": "Epic Voice",
  "license": "MIT"
}
```

---

### 3.2 React Component Library

**Implementation**:
```tsx
// /opt/livekit1/sdk/react/components/VoiceWidget.tsx

import { useState } from 'react';
import { EpicVoiceClient } from '@epic-voice/sdk';

interface VoiceWidgetProps {
  apiKey: string;
  agentId: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
}

export function VoiceWidget({ apiKey, agentId, position = 'bottom-right', theme = 'auto' }: VoiceWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const client = new EpicVoiceClient(apiKey);

  const handleStartCall = async () => {
    try {
      const call = await client.makeCall('browser', agentId);
      setIsCallActive(true);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  return (
    <div className={`voice-widget voice-widget-${position}`}>
      {isOpen ? (
        <div className="voice-widget-panel">
          <div className="voice-widget-header">
            <h3>Voice Assistant</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <div className="voice-widget-body">
            {isCallActive ? (
              <CallInterface onEnd={() => setIsCallActive(false)} />
            ) : (
              <button onClick={handleStartCall}>
                Start Voice Call
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          className="voice-widget-trigger"
          onClick={() => setIsOpen(true)}
        >
          🎤
        </button>
      )}
    </div>
  );
}
```

---

### 3.3 API Documentation

**OpenAPI Specification**:
```yaml
# /opt/livekit1/docs/openapi.yaml

openapi: 3.0.0
info:
  title: Epic Voice API
  version: 1.0.0
  description: White-label Voice AI infrastructure platform

servers:
  - url: https://ai.epic.dm/api/v1
    description: Production server

security:
  - BearerAuth: []

paths:
  /agents:
    post:
      summary: Create a new voice agent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AgentCreate'
      responses:
        '201':
          description: Agent created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Agent'

  /calls:
    post:
      summary: Initiate an outbound call
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                to:
                  type: string
                  description: Phone number to call
                agent_id:
                  type: string
                  format: uuid
      responses:
        '201':
          description: Call initiated successfully

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## Implementation Checklist

### Week 1-2: White-Label Dashboard ✅
- [ ] Custom domain support (CNAME + verification)
- [ ] Rebrandable UI (logo, colors, fonts)
- [ ] Partner settings page
- [ ] Embed code generator

### Week 3-4: Partner Portal ✅
- [ ] Partner tier management (Agency/Platform/Enterprise)
- [ ] Usage analytics dashboard
- [ ] Billing/invoicing system
- [ ] API key management (create/revoke/rotate)
- [ ] Webhook configuration

### Week 5-6: Developer SDK ✅
- [ ] JavaScript SDK (NPM package)
- [ ] React component library
- [ ] Python client library
- [ ] OpenAPI documentation
- [ ] Code examples & tutorials

---

## Success Metrics

**Week 4 Checkpoint**:
- [ ] 3 partner domains verified
- [ ] All partners have custom branding configured
- [ ] Usage tracking functional for all partners

**Week 6 Launch**:
- [ ] SDK published to NPM
- [ ] Documentation site live
- [ ] 3-5 pilot partners onboarded
- [ ] First partner goes live with embedded widget

---

## Investment Breakdown

| Component | Timeline | Cost |
|-----------|----------|------|
| White-Label Dashboard | Week 1-2 | $15K-$20K |
| Partner Portal | Week 3-4 | $15K-$20K |
| Developer SDK | Week 5-6 | $10K-$20K |
| **Total** | **6 weeks** | **$40K-$60K** |

**Expected ROI**:
- 3 pilot partners at $5K/mo = $15K MRR
- ROI achieved in 3-4 months
- Scale to 20 partners = $200K+ MRR within 12 months

---

## Next Steps

1. **This Week**: Review implementation plan with engineering team
2. **Week 1**: Start custom domain + branding infrastructure
3. **Week 2**: Complete white-label dashboard features
4. **Week 3**: Begin partner portal development
5. **Week 4**: Complete analytics + billing systems
6. **Week 5**: Build JavaScript SDK + React components
7. **Week 6**: Finalize documentation and onboard pilot partners

**Questions or feedback?** Let's discuss!
