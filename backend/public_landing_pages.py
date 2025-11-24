"""
Public Landing Pages - No Authentication Required
Renders landing pages and handles form submissions
"""

from flask import Blueprint, request, jsonify, render_template_string
from database import get_db
from backend.funnel_engine.models import Funnel, FunnelStatus, FunnelExecution, ExecutionStatus
from backend.funnel_engine.enqueue import enqueue_for_execution
import uuid
import logging
import re
import json

logger = logging.getLogger(__name__)

# Create blueprint
public_lp_bp = Blueprint('public_landing_pages', __name__)


# ============================================================================
# PUBLIC LANDING PAGE RENDERER
# ============================================================================

@public_lp_bp.route('/l/<funnel_id>', methods=['GET'])
def render_landing_page(funnel_id: str):
    """
    Render public landing page for a funnel

    GET /l/{funnel-id}

    No authentication required
    """
    db = get_db()

    try:
        # Look up funnel
        funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()

        if not funnel:
            return "Landing page not found", 404

        # Check if landing page is enabled
        settings = funnel.settings or {}
        landing_page = settings.get('landing_page', {})

        if not landing_page.get('enabled', False):
            return "This landing page is not available", 404

        # Extract landing page config
        headline = landing_page.get('headline', 'Get Started')
        subheadline = landing_page.get('subheadline', '')
        description = landing_page.get('description', '')
        benefits = landing_page.get('benefits', [])
        cta_text = landing_page.get('cta_text', 'Submit')
        success_message = landing_page.get('success_message', 'Thank you! We will contact you shortly.')
        collect_fields = landing_page.get('collect_fields', [])
        theme = landing_page.get('theme', {})

        # Load brand kit colors if brand kit is associated
        if hasattr(funnel, 'brandKitId') and funnel.brandKitId:
            try:
                from database import BrandKit
                brand_kit = db.query(BrandKit).filter(BrandKit.id == funnel.brandKitId).first()

                if brand_kit and brand_kit.brandColors:
                    # Override theme colors with brand kit colors
                    if len(brand_kit.brandColors) > 0:
                        theme['primary_color'] = brand_kit.brandColors[0].get('hex', theme.get('primary_color', '#0066FF'))
                    if len(brand_kit.brandColors) > 1:
                        theme['accent_color'] = brand_kit.brandColors[1].get('hex', theme.get('accent_color', '#10B981'))

                    logger.info(f"Applied brand kit {brand_kit.name} colors to landing page")
            except Exception as e:
                logger.warning(f"Failed to load brand kit for landing page: {e}")

        # Render HTML template
        html = render_landing_page_html(
            funnel_id=funnel_id,
            funnel_name=funnel.name,
            headline=headline,
            subheadline=subheadline,
            description=description,
            benefits=benefits,
            cta_text=cta_text,
            success_message=success_message,
            collect_fields=collect_fields,
            theme=theme
        )

        return html, 200, {'Content-Type': 'text/html; charset=utf-8'}

    except Exception as e:
        logger.error(f"Error rendering landing page {funnel_id}: {e}", exc_info=True)
        return "Error loading page", 500
    finally:
        db.close()


# ============================================================================
# PUBLIC FORM SUBMISSION
# ============================================================================

@public_lp_bp.route('/api/public/funnels/<funnel_id>/submit', methods=['POST'])
def submit_landing_page_form(funnel_id: str):
    """
    Handle public landing page form submission

    POST /api/public/funnels/{funnel-id}/submit
    Body: { first_name, last_name, phone_number, email, ... }

    No authentication required
    """
    db = get_db()

    try:
        # Look up funnel
        funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()

        if not funnel:
            return jsonify({'error': 'Funnel not found'}), 404

        # Check if funnel is active
        if funnel.status != FunnelStatus.ACTIVE:
            return jsonify({'error': 'This funnel is not currently active'}), 400

        # Get form data
        data = request.json or {}

        # Extract required field
        phone_number = data.get('phone_number', '').strip()
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400

        # Normalize phone number
        phone_number = re.sub(r'[^\d+]', '', phone_number)
        if not phone_number.startswith('+'):
            phone_number = '+1' + phone_number

        # Validate phone format
        if not re.match(r'^\+\d{10,15}$', phone_number):
            return jsonify({'error': f'Invalid phone number format'}), 400

        # Extract other fields
        first_name = data.get('first_name', '').strip() or None
        last_name = data.get('last_name', '').strip() or None
        email = data.get('email', '').strip() or None
        company = data.get('company', '').strip() or None

        # Validate email if provided
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return jsonify({'error': f'Invalid email format'}), 400

        # Build contact data
        contact_data = {
            'phone_number': phone_number,
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'company': company,
            'source': 'landing_page',
            'funnel_id': funnel_id,
            'funnel_name': funnel.name
        }

        # Add any extra fields from the form
        for key, value in data.items():
            if key not in contact_data and value:
                contact_data[key] = value

        # Create funnel execution
        execution = FunnelExecution(
            id=str(uuid.uuid4()),
            funnel_id=funnel_id,
            user_id=funnel.user_id,
            contact_data=contact_data,
            context={'trigger': 'landing_page', 'source': 'public_form'},
            status=ExecutionStatus.ACTIVE,
        )

        db.add(execution)
        db.commit()
        db.refresh(execution)

        # Enqueue first stage
        queue_entry = enqueue_for_execution(db, execution.id)

        logger.info(f"✅ Landing page submission for funnel {funnel_id}: execution {execution.id}")

        # Get success message from landing page config
        settings = funnel.settings or {}
        landing_page = settings.get('landing_page', {})
        success_message = landing_page.get('success_message', 'Thank you! We will contact you shortly.')

        return jsonify({
            'success': True,
            'message': success_message,
            'execution_id': execution.id
        }), 201

    except Exception as e:
        logger.error(f"Error submitting landing page form: {e}", exc_info=True)
        db.rollback()
        return jsonify({'error': 'Failed to submit form. Please try again.'}), 500
    finally:
        db.close()


# ============================================================================
# HTML TEMPLATE RENDERER
# ============================================================================

def render_landing_page_html(
    funnel_id: str,
    funnel_name: str,
    headline: str,
    subheadline: str,
    description: str,
    benefits: list,
    cta_text: str,
    success_message: str,
    collect_fields: list,
    theme: dict
) -> str:
    """
    Render landing page HTML from configuration
    """

    primary_color = theme.get('primary_color', '#0066FF')
    accent_color = theme.get('accent_color', '#10B981')
    template = theme.get('template', 'modern')

    # Build form fields HTML
    form_fields_html = ""
    for field in collect_fields:
        if isinstance(field, dict):
            field_name = field.get('name', '')
            field_label = field.get('label', field_name.replace('_', ' ').title())
            field_type = field.get('type', 'text')
            required = field.get('required', False)
            placeholder = field.get('placeholder', '')
        else:
            # Simple string field name
            field_name = field
            field_label = field.replace('_', ' ').title()
            field_type = 'email' if 'email' in field else ('tel' if 'phone' in field else 'text')
            required = field in ['phone_number', 'email']
            placeholder = ''

        required_attr = 'required' if required else ''

        form_fields_html += f'''
        <div class="form-group">
            <label for="{field_name}">{field_label}{'*' if required else ''}</label>
            <input
                type="{field_type}"
                id="{field_name}"
                name="{field_name}"
                placeholder="{placeholder or field_label}"
                {required_attr}
            />
        </div>
        '''

    # Build benefits HTML
    benefits_html = ""
    for benefit in benefits:
        benefits_html += f'<li><span class="check">✓</span>{benefit}</li>'

    # HTML template
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{headline} - {funnel_name}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, {primary_color} 0%, {accent_color} 100%);
            min-height: 100vh;
            padding: 20px;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            align-items: center;
            min-height: calc(100vh - 40px);
        }}

        .content {{
            color: white;
        }}

        h1 {{
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 20px;
            line-height: 1.2;
        }}

        .subheadline {{
            font-size: 1.5rem;
            margin-bottom: 20px;
            opacity: 0.95;
            font-weight: 300;
        }}

        .description {{
            font-size: 1.1rem;
            margin-bottom: 30px;
            opacity: 0.9;
        }}

        .benefits {{
            list-style: none;
            margin-bottom: 30px;
        }}

        .benefits li {{
            font-size: 1.1rem;
            margin-bottom: 15px;
            padding-left: 35px;
            position: relative;
        }}

        .benefits .check {{
            position: absolute;
            left: 0;
            font-size: 1.5rem;
            font-weight: bold;
            color: {accent_color};
        }}

        .form-container {{
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }}

        .form-group {{
            margin-bottom: 20px;
        }}

        label {{
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 0.95rem;
        }}

        input {{
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.2s;
        }}

        input:focus {{
            outline: none;
            border-color: {primary_color};
            box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
        }}

        .submit-btn {{
            width: 100%;
            padding: 16px;
            background: {primary_color};
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 10px;
        }}

        .submit-btn:hover {{
            background: {accent_color};
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }}

        .submit-btn:disabled {{
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }}

        .success-message {{
            display: none;
            text-align: center;
            padding: 40px;
            background: #10b981;
            color: white;
            border-radius: 10px;
            font-size: 1.2rem;
        }}

        .error-message {{
            display: none;
            padding: 12px;
            background: #fee;
            color: #c00;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.95rem;
        }}

        @media (max-width: 968px) {{
            .container {{
                grid-template-columns: 1fr;
                gap: 40px;
            }}

            h1 {{
                font-size: 2.5rem;
            }}

            .subheadline {{
                font-size: 1.2rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <h1>{headline}</h1>
            <p class="subheadline">{subheadline}</p>
            <p class="description">{description}</p>
            <ul class="benefits">
                {benefits_html}
            </ul>
        </div>

        <div class="form-container">
            <div class="error-message" id="error"></div>

            <form id="landing-form">
                {form_fields_html}

                <button type="submit" class="submit-btn">{cta_text}</button>
            </form>

            <div class="success-message" id="success">
                {success_message}
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('landing-form');
        const submitBtn = form.querySelector('.submit-btn');
        const errorDiv = document.getElementById('error');
        const successDiv = document.getElementById('success');

        form.addEventListener('submit', async (e) => {{
            e.preventDefault();

            // Hide previous errors
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            // Get form data
            const formData = new FormData(form);
            const data = {{}};
            formData.forEach((value, key) => {{
                data[key] = value;
            }});

            try {{
                const response = await fetch('/api/public/funnels/{funnel_id}/submit', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json'
                    }},
                    body: JSON.stringify(data)
                }});

                const result = await response.json();

                if (response.ok) {{
                    // Success!
                    form.style.display = 'none';
                    successDiv.style.display = 'block';
                    successDiv.textContent = result.message || '{success_message}';
                }} else {{
                    // Error
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = result.error || 'Something went wrong. Please try again.';
                    submitBtn.disabled = false;
                    submitBtn.textContent = '{cta_text}';
                }}
            }} catch (error) {{
                console.error('Submission error:', error);
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Network error. Please check your connection and try again.';
                submitBtn.disabled = false;
                submitBtn.textContent = '{cta_text}';
            }}
        }});
    </script>
</body>
</html>'''

    return html
