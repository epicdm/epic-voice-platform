"""
Brandfetch API Client
Extracts brand information (logos, colors, fonts) from company domains
"""

import os
import logging
import requests
from typing import Dict, List, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class BrandfetchClient:
    """Client for Brandfetch API to extract brand information."""

    BASE_URL = "https://api.brandfetch.io/v2"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Brandfetch client.

        Args:
            api_key: Brandfetch API key (or set BRANDFETCH_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('BRANDFETCH_API_KEY')
        if not self.api_key:
            logger.warning("No Brandfetch API key provided. Set BRANDFETCH_API_KEY environment variable.")

        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}',
                'Accept': 'application/json'
            })

    def _detect_platform(self, url: str) -> Optional[str]:
        """
        Detect if URL is a social media platform.

        Returns:
            Platform name ('facebook', 'instagram', etc.) or None
        """
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'

        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        path = parsed.path.lower()

        # Check for social media platforms
        if 'facebook.com' in domain and path and path != '/':
            return 'facebook'

        if 'instagram.com' in domain and path and path != '/':
            return 'instagram'

        return None

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain

    def fetch_brand(self, domain_or_url: str) -> Optional[Dict]:
        """
        Fetch brand information for a domain.

        Args:
            domain_or_url: Domain (e.g., 'apple.com') or URL (e.g., 'https://apple.com')

        Returns:
            Dict with brand information or None if not found
        """
        try:
            domain = self._extract_domain(domain_or_url)
            logger.info(f"Fetching brand info for domain: {domain}")

            url = f"{self.BASE_URL}/brands/{domain}"
            response = self.session.get(url, timeout=10)

            if response.status_code == 404:
                logger.warning(f"Brand not found for domain: {domain}")
                return None

            response.raise_for_status()
            data = response.json()

            logger.info(f"Successfully fetched brand info for {domain}")
            return data

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching brand from Brandfetch: {e}")
            return None

    def extract_logos(self, brand_data: Dict) -> List[Dict]:
        """
        Extract logo URLs from brand data.

        Args:
            brand_data: Response from Brandfetch API

        Returns:
            List of logo dictionaries with URLs and formats
        """
        logos = []

        for logo in brand_data.get('logos', []):
            logo_info = {
                'type': logo.get('type', 'logo'),
                'theme': logo.get('theme', 'light'),
                'formats': []
            }

            for fmt in logo.get('formats', []):
                logo_info['formats'].append({
                    'src': fmt.get('src'),
                    'background': fmt.get('background', 'transparent'),
                    'format': fmt.get('format', 'png'),
                    'size': fmt.get('size'),
                    'width': fmt.get('width'),
                    'height': fmt.get('height')
                })

            logos.append(logo_info)

        return logos

    def extract_colors(self, brand_data: Dict) -> List[Dict]:
        """
        Extract brand colors from brand data.

        Args:
            brand_data: Response from Brandfetch API

        Returns:
            List of color dictionaries with hex codes and usage
        """
        colors = []

        raw_colors = brand_data.get('colors', [])
        for idx, color in enumerate(raw_colors):
            if isinstance(color, dict):
                hex_code = color.get('hex', color.get('value', ''))
                color_type = color.get('type', 'primary' if idx == 0 else 'accent')
            else:
                hex_code = color
                color_type = 'primary' if idx == 0 else 'accent'

            if hex_code:
                colors.append({
                    'hex': hex_code if hex_code.startswith('#') else f'#{hex_code}',
                    'name': f'brand-{idx + 1}',
                    'type': color_type,
                    'usage': 'primary' if idx == 0 else 'accent'
                })

        return colors

    def extract_fonts(self, brand_data: Dict) -> List[Dict]:
        """
        Extract font information from brand data.

        Args:
            brand_data: Response from Brandfetch API

        Returns:
            List of font dictionaries
        """
        fonts = []

        for font in brand_data.get('fonts', []):
            if isinstance(font, dict):
                fonts.append({
                    'family': font.get('name', font.get('family', '')),
                    'type': font.get('type', 'sans-serif'),
                    'origin': font.get('origin', 'unknown'),
                    'originId': font.get('originId'),
                    'weights': font.get('weights', [400])
                })
            elif isinstance(font, str):
                fonts.append({
                    'family': font,
                    'type': 'sans-serif',
                    'weights': [400]
                })

        return fonts

    def extract_company_info(self, brand_data: Dict) -> Dict:
        """
        Extract company information from brand data.

        Args:
            brand_data: Response from Brandfetch API

        Returns:
            Dict with company information
        """
        return {
            'name': brand_data.get('name'),
            'domain': brand_data.get('domain'),
            'description': brand_data.get('description'),
            'industry': brand_data.get('industry'),
            'claimed': brand_data.get('claimed', False)
        }

    def extract_social_links(self, brand_data: Dict) -> Dict:
        """
        Extract social media links from brand data.

        Args:
            brand_data: Response from Brandfetch API

        Returns:
            Dict with social media URLs
        """
        social_links = {}

        for link in brand_data.get('links', []):
            if isinstance(link, dict):
                name = link.get('name', '').lower()
                url = link.get('url')
                if name and url:
                    social_links[name] = url

        return social_links

    def extract_all(self, domain_or_url: str) -> Optional[Dict]:
        """
        Extract all brand information in one call.

        Args:
            domain_or_url: Domain or URL to extract from

        Returns:
            Complete brand kit data or None if extraction failed

        Raises:
            ValueError: If URL is a social media profile (use Apify instead)
        """
        # Check if this is a social media profile URL
        platform = self._detect_platform(domain_or_url)
        if platform:
            raise ValueError(f"social_media:{platform}")

        brand_data = self.fetch_brand(domain_or_url)

        if not brand_data:
            return None

        logos = self.extract_logos(brand_data)

        # Get primary logo URL
        primary_logo_url = None
        primary_logo_svg = None

        for logo in logos:
            if logo['type'] == 'logo':
                for fmt in logo['formats']:
                    if fmt['format'] == 'svg' and not primary_logo_svg:
                        primary_logo_svg = fmt['src']
                    elif fmt['format'] in ['png', 'jpg', 'jpeg'] and not primary_logo_url:
                        primary_logo_url = fmt['src']

        company_info = self.extract_company_info(brand_data)

        return {
            'logoUrl': primary_logo_url,
            'logoSvg': primary_logo_svg,
            'logos': logos,  # All logo variations
            'brandColors': self.extract_colors(brand_data),
            'fonts': self.extract_fonts(brand_data),
            'companyName': company_info['name'],
            'description': company_info['description'],
            'industry': company_info['industry'],
            'websiteUrl': f"https://{company_info['domain']}" if company_info['domain'] else None,
            'socialLinks': self.extract_social_links(brand_data),
            'sourceType': 'website',
            'extractionStatus': 'completed',
            'extractionMetadata': {
                'provider': 'brandfetch',
                'claimed': company_info['claimed'],
                'raw_data_keys': list(brand_data.keys())
            }
        }


# Example usage
if __name__ == '__main__':
    import json

    # Test with Apple
    client = BrandfetchClient()
    result = client.extract_all('apple.com')

    if result:
        print(json.dumps(result, indent=2))
    else:
        print("Failed to extract brand info")
