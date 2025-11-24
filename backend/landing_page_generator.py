"""
Landing Page AI Generator
Generates landing page content using OpenAI
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import openai

logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")


def generate_landing_page_content(
    funnel_name: str,
    funnel_description: str,
    purpose: str,
    industry: Optional[str] = None,
    tone: str = "professional"
) -> Dict[str, Any]:
    """
    Generate landing page content using AI

    Args:
        funnel_name: Name of the funnel
        funnel_description: Description of the funnel
        purpose: User-provided purpose (e.g., "Real estate lead generation")
        industry: Industry category (optional)
        tone: Tone of voice (professional, friendly, urgent)

    Returns:
        Dict with landing page configuration
    """

    prompt = f"""You are an expert landing page copywriter. Generate compelling, conversion-focused landing page content.

Context:
- Funnel Name: {funnel_name}
- Description: {funnel_description}
- Purpose: {purpose}
- Industry: {industry or 'General'}
- Tone: {tone}

Generate landing page content that will convert visitors into leads. The landing page is for a voice AI automation system that will:
1. Call the lead immediately after they submit the form
2. Follow up with emails and SMS automatically
3. Nurture the lead through an automated funnel

Create content that emphasizes speed, convenience, and expert consultation.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{{
  "headline": "6-10 word benefit-focused headline",
  "subheadline": "15-25 word expansion of headline, emphasizing immediate response",
  "description": "2-3 sentences about what happens after they submit (emphasize AI will call them quickly)",
  "benefits": [
    "First benefit (focus on speed/convenience)",
    "Second benefit (focus on expertise/value)",
    "Third benefit (focus on no commitment/risk-free)"
  ],
  "cta_text": "2-4 word action-oriented button text",
  "success_message": "What user sees after submitting (mention they'll receive a call soon)",
  "recommended_fields": ["first_name", "last_name", "phone_number", "email"],
  "theme": {{
    "primary_color": "#0066FF",
    "accent_color": "#00CC88",
    "template": "modern"
  }}
}}

Make it compelling and conversion-focused. Use power words. Emphasize immediate response time."""

    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert landing page copywriter. Return only valid JSON, no markdown formatting."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.8,
            max_tokens=1000
        )

        content = response.choices[0].message.content.strip()

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        content = content.strip()

        # Parse JSON
        result = json.loads(content)

        # Add metadata
        result["generated_at"] = "now"
        result["generator_version"] = "1.0"

        logger.info(f"✅ Generated landing page content for: {funnel_name}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        logger.error(f"Response content: {content}")

        # Return fallback content
        return get_fallback_content(funnel_name, purpose)

    except Exception as e:
        logger.error(f"Error generating landing page content: {e}", exc_info=True)
        return get_fallback_content(funnel_name, purpose)


def get_fallback_content(funnel_name: str, purpose: str) -> Dict[str, Any]:
    """
    Fallback landing page content if AI generation fails
    """
    return {
        "headline": "Get Your Free Consultation",
        "subheadline": "Talk to an expert in minutes, not days. Our AI assistant will call you immediately.",
        "description": "Submit your information below and we'll call you within 60 seconds. Get expert advice with zero commitment or obligation.",
        "benefits": [
            "Instant response - we call you in under 60 seconds",
            "Expert consultation tailored to your needs",
            "Completely free, no strings attached"
        ],
        "cta_text": "Get My Free Call",
        "success_message": "Perfect! Expect a call from us in the next 60 seconds.",
        "recommended_fields": ["first_name", "last_name", "phone_number", "email"],
        "theme": {
            "primary_color": "#0066FF",
            "accent_color": "#10B981",
            "template": "modern"
        },
        "generated_at": "fallback",
        "generator_version": "1.0"
    }


# Industry-specific color schemes
INDUSTRY_COLORS = {
    "real_estate": {"primary": "#1E40AF", "accent": "#10B981"},
    "healthcare": {"primary": "#0891B2", "accent": "#EC4899"},
    "finance": {"primary": "#1E3A8A", "accent": "#F59E0B"},
    "legal": {"primary": "#1F2937", "accent": "#3B82F6"},
    "automotive": {"primary": "#DC2626", "accent": "#F59E0B"},
    "technology": {"primary": "#6366F1", "accent": "#8B5CF6"},
    "education": {"primary": "#0284C7", "accent": "#F97316"},
    "default": {"primary": "#0066FF", "accent": "#00CC88"}
}


def get_industry_colors(industry: Optional[str]) -> Dict[str, str]:
    """Get color scheme for industry"""
    return INDUSTRY_COLORS.get(industry, INDUSTRY_COLORS["default"])
