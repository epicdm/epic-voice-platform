"""
White-Label API Endpoints
Provides partner infrastructure features: custom domains, branding, API keys, usage tracking
"""

from flask import request, jsonify
from database import SessionLocal
from sqlalchemy import text
import hashlib
import secrets
import re
import json
import os
from datetime import datetime, timedelta

def setup_white_label_endpoints(app):
    """
    Set up white-label infrastructure API endpoints
    """

    # ============================================
    # Custom Domain Management
    # ============================================

    @app.route('/api/user/white-label/domain', methods=['GET', 'POST', 'DELETE'])
    def manage_custom_domain():
        """
        Configure custom domain for white-label partner
        GET: List all domains
        POST: Add new domain with verification requirements
        DELETE: Remove domain
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            if request.method == 'GET':
                # List all domains for this user
                result = db.execute(text("""
                    SELECT id, domain, verified, created_at, verified_at
                    FROM partner_domains
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                """), {'user_id': user_id})

                domains = result.fetchall()
                return jsonify({
                    'domains': [
                        {
                            'id': row[0],
                            'domain': row[1],
                            'verified': row[2],
                            'created_at': row[3].isoformat() if row[3] else None,
                            'verified_at': row[4].isoformat() if row[4] else None
                        }
                        for row in domains
                    ]
                })

            elif request.method == 'POST':
                data = request.get_json()
                domain = data.get('domain', '').lower().strip()

                # Validate domain format
                if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$', domain):
                    return jsonify({'error': 'Invalid domain format'}), 400

                # Generate verification token
                verification_token = secrets.token_urlsafe(32)

                # Save domain configuration
                result = db.execute(text("""
                    INSERT INTO partner_domains (user_id, domain, verification_token)
                    VALUES (:user_id, :domain, :token)
                    ON CONFLICT (domain) DO UPDATE
                    SET verification_token = :token, verified = FALSE
                    RETURNING id
                """), {'user_id': user_id, 'domain': domain, 'token': verification_token})

                domain_id = result.fetchone()[0]
                db.commit()

                # Return DNS records for partner to configure
                return jsonify({
                    'id': domain_id,
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
                    'verification_url': f'/api/user/white-label/domain/{domain_id}/verify'
                })

            elif request.method == 'DELETE':
                domain_id = request.args.get('id')

                db.execute(text("""
                    DELETE FROM partner_domains
                    WHERE id = :domain_id AND user_id = :user_id
                """), {'domain_id': domain_id, 'user_id': user_id})
                db.commit()

                return jsonify({'success': True})

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/user/white-label/domain/<domain_id>/verify', methods=['POST'])
    def verify_custom_domain(domain_id):
        """
        Verify domain ownership by checking DNS records
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Get domain and verification token
            result = db.execute(text("""
                SELECT domain, verification_token
                FROM partner_domains
                WHERE id = :domain_id AND user_id = :user_id
            """), {'domain_id': domain_id, 'user_id': user_id})

            row = result.fetchone()
            if not row:
                return jsonify({'error': 'Domain not found'}), 404

            domain, expected_token = row

            # Check DNS records using dnspython
            try:
                import dns.resolver

                # Check CNAME record
                cname_valid = False
                try:
                    cname_records = dns.resolver.resolve(domain, 'CNAME')
                    for record in cname_records:
                        if 'ai.epic.dm' in str(record).lower():
                            cname_valid = True
                            break
                except:
                    pass

                # Check TXT record
                txt_valid = False
                try:
                    txt_records = dns.resolver.resolve(f'_epic_verify.{domain}', 'TXT')
                    for record in txt_records:
                        if str(record).strip('"') == expected_token:
                            txt_valid = True
                            break
                except:
                    pass

                if cname_valid and txt_valid:
                    # Mark domain as verified
                    db.execute(text("""
                        UPDATE partner_domains
                        SET verified = TRUE, verified_at = CURRENT_TIMESTAMP
                        WHERE id = :domain_id AND user_id = :user_id
                    """), {'domain_id': domain_id, 'user_id': user_id})
                    db.commit()

                    return jsonify({
                        'verified': True,
                        'message': 'Domain verified successfully'
                    })
                else:
                    return jsonify({
                        'verified': False,
                        'error': 'DNS records not found or incorrect',
                        'cname_valid': cname_valid,
                        'txt_valid': txt_valid
                    }), 400

            except ImportError:
                return jsonify({
                    'error': 'DNS verification library not installed. Please install dnspython: pip install dnspython'
                }), 500
            except Exception as e:
                return jsonify({
                    'verified': False,
                    'error': f'DNS lookup failed: {str(e)}'
                }), 400

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    # ============================================
    # Branding Configuration
    # ============================================

    @app.route('/api/user/white-label/branding', methods=['GET', 'PUT'])
    def manage_branding():
        """
        Get or update white-label branding configuration
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            if request.method == 'GET':
                result = db.execute(text("""
                    SELECT branding_config FROM users WHERE id = :user_id
                """), {'user_id': user_id})
                row = result.fetchone()
                return jsonify(row[0] if row and row[0] else {})

            elif request.method == 'PUT':
                data = request.get_json()

                # Validate colors if provided
                if 'primary_color' in data:
                    if not re.match(r'^#[0-9A-Fa-f]{6}$', data['primary_color']):
                        return jsonify({'error': 'Invalid primary color format'}), 400

                if 'secondary_color' in data:
                    if not re.match(r'^#[0-9A-Fa-f]{6}$', data['secondary_color']):
                        return jsonify({'error': 'Invalid secondary color format'}), 400

                if 'accent_color' in data:
                    if not re.match(r'^#[0-9A-Fa-f]{6}$', data['accent_color']):
                        return jsonify({'error': 'Invalid accent color format'}), 400

                # Update branding config
                db.execute(text("""
                    UPDATE users
                    SET branding_config = :config::jsonb
                    WHERE id = :user_id
                """), {'config': json.dumps(data), 'user_id': user_id})
                db.commit()

                return jsonify({'success': True, 'branding': data})

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/user/white-label/logo', methods=['POST', 'DELETE'])
    def manage_logo():
        """
        Upload or delete partner logo
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            if request.method == 'POST':
                if 'logo' not in request.files:
                    return jsonify({'error': 'No logo file provided'}), 400

                logo = request.files['logo']

                # Validate file type
                allowed_extensions = {'.png', '.jpg', '.jpeg', '.svg', '.webp'}
                file_ext = os.path.splitext(logo.filename)[1].lower()
                if file_ext not in allowed_extensions:
                    return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, SVG, WEBP'}), 400

                # Save logo (TODO: implement S3 or local storage)
                # For now, we'll just return a placeholder URL
                logo_url = f'/uploads/logos/{user_id}{file_ext}'

                # Update branding config with logo URL
                db.execute(text("""
                    UPDATE users
                    SET branding_config = jsonb_set(
                        COALESCE(branding_config, '{}'::jsonb),
                        '{logo_url}',
                        to_jsonb(:logo_url::text)
                    )
                    WHERE id = :user_id
                """), {'logo_url': logo_url, 'user_id': user_id})
                db.commit()

                return jsonify({'logo_url': logo_url})

            elif request.method == 'DELETE':
                # Remove logo URL from branding config
                db.execute(text("""
                    UPDATE users
                    SET branding_config = jsonb_set(
                        branding_config,
                        '{logo_url}',
                        'null'::jsonb
                    )
                    WHERE id = :user_id
                """), {'user_id': user_id})
                db.commit()

                return jsonify({'success': True})

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    # ============================================
    # API Key Management
    # ============================================

    @app.route('/api/user/white-label/api-keys', methods=['GET', 'POST'])
    def manage_api_keys():
        """
        List or create API keys
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            if request.method == 'GET':
                result = db.execute(text("""
                    SELECT id, name, key_prefix, created_at, last_used_at, revoked_at
                    FROM api_keys
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                """), {'user_id': user_id})

                keys = result.fetchall()
                return jsonify({
                    'keys': [
                        {
                            'id': row[0],
                            'name': row[1],
                            'prefix': row[2],
                            'created_at': row[3].isoformat() if row[3] else None,
                            'last_used_at': row[4].isoformat() if row[4] else None,
                            'revoked': row[5] is not None
                        }
                        for row in keys
                    ]
                })

            elif request.method == 'POST':
                data = request.get_json()
                name = data.get('name', '').strip()

                if not name:
                    return jsonify({'error': 'API key name is required'}), 400

                # Generate API key: epic_live_xxxxxxxxxxxxxxxx
                key = f"epic_live_{secrets.token_urlsafe(32)}"
                key_hash = hashlib.sha256(key.encode()).hexdigest()
                key_prefix = key[:15] + '...'

                result = db.execute(text("""
                    INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
                    VALUES (:user_id, :name, :key_hash, :key_prefix)
                    RETURNING id
                """), {'user_id': user_id, 'name': name, 'key_hash': key_hash, 'key_prefix': key_prefix})

                key_id = result.fetchone()[0]
                db.commit()

                return jsonify({
                    'id': key_id,
                    'key': key,  # Only returned once!
                    'prefix': key_prefix,
                    'message': 'Save this key securely. It will not be shown again.'
                })

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/user/white-label/api-keys/<key_id>', methods=['DELETE'])
    def revoke_api_key(key_id):
        """
        Revoke an API key
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            db.execute(text("""
                UPDATE api_keys
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE id = :key_id AND user_id = :user_id
            """), {'key_id': key_id, 'user_id': user_id})
            db.commit()

            return jsonify({'success': True})
        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    # ============================================
    # Partner Tier & Usage
    # ============================================

    @app.route('/api/user/white-label/tier', methods=['GET'])
    def get_partner_tier():
        """
        Get partner tier and limits
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            result = db.execute(text("""
                SELECT partner_tier, partner_limits
                FROM users
                WHERE id = :user_id
            """), {'user_id': user_id}).fetchone()

            return jsonify({
                'tier': result[0] if result and result[0] else 'free',
                'limits': result[1] if result and result[1] else {}
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/user/white-label/usage', methods=['GET'])
    def get_partner_usage():
        """
        Get partner usage statistics
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Get date range from query params
            start_date = request.args.get('start_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))

            result = db.execute(text("""
                SELECT
                    date,
                    total_calls,
                    total_minutes,
                    total_cost,
                    inbound_calls,
                    outbound_calls,
                    failed_calls
                FROM partner_usage
                WHERE user_id = :user_id
                  AND date BETWEEN :start_date AND :end_date
                ORDER BY date DESC
            """), {'user_id': user_id, 'start_date': start_date, 'end_date': end_date})

            usage = result.fetchall()

            return jsonify({
                'usage': [
                    {
                        'date': row[0].isoformat() if row[0] else None,
                        'calls': row[1],
                        'minutes': row[2],
                        'cost': float(row[3]) if row[3] else 0,
                        'inbound_calls': row[4],
                        'outbound_calls': row[5],
                        'failed_calls': row[6]
                    }
                    for row in usage
                ],
                'start_date': start_date,
                'end_date': end_date
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    # ============================================
    # Embed Widget Code
    # ============================================

    @app.route('/api/user/white-label/embed-code', methods=['GET'])
    def generate_embed_code():
        """
        Generate embeddable widget code for partner websites
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Get user's first API key (or generate one)
            result = db.execute(text("""
                SELECT key_prefix FROM api_keys
                WHERE user_id = :user_id AND revoked_at IS NULL
                LIMIT 1
            """), {'user_id': user_id})

            row = result.fetchone()
            api_key_prefix = row[0] if row else 'YOUR_API_KEY_HERE'

            # Get custom domain or use default
            result = db.execute(text("""
                SELECT domain FROM partner_domains
                WHERE user_id = :user_id AND verified = TRUE
                LIMIT 1
            """), {'user_id': user_id})

            row = result.fetchone()
            domain = row[0] if row else 'ai.epic.dm'

            # Generate embed code
            embed_code = f"""<!-- Epic Voice AI Widget -->
<script src="https://{domain}/embed/widget.js"></script>
<script>
  EpicVoice.init({{
    apiKey: '{api_key_prefix}',  // Replace with your actual API key
    position: 'bottom-right',
    theme: 'auto'
  }});
</script>"""

            return jsonify({
                'embed_code': embed_code,
                'preview_url': f'https://{domain}/embed/preview',
                'domain': domain
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    print("✅ White-label API endpoints initialized")
    return app
