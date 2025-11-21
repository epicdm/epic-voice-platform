"""
Apify API Client
Extracts brand information from social media profiles (Instagram, Facebook)
"""

import os
import logging
import requests
import time
from typing import Dict, List, Optional
from urllib.parse import urlparse
from colorthief import ColorThief
from io import BytesIO

logger = logging.getLogger(__name__)


class ApifyClient:
    """Client for Apify API to extract social media profile information."""

    BASE_URL = "https://api.apify.com/v2"
    INSTAGRAM_ACTOR = "apify/instagram-profile-scraper"
    FACEBOOK_ACTOR = "apify/facebook-pages-scraper"

    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize Apify client.

        Args:
            api_token: Apify API token (or set APIFY_API_TOKEN env var)
        """
        self.api_token = api_token or os.getenv('APIFY_API_TOKEN')
        if not self.api_token:
            logger.warning("No Apify API token provided. Set APIFY_API_TOKEN environment variable.")

        self.session = requests.Session()
        if self.api_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_token}',
                'Content-Type': 'application/json'
            })

    def _extract_username_from_url(self, url: str, platform: str) -> Optional[str]:
        """
        Extract username from social media URL.

        Args:
            url: Social media profile URL
            platform: Platform name ('instagram' or 'facebook')

        Returns:
            Username or None
        """
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'

        parsed = urlparse(url)
        path = parsed.path.strip('/')

        # Remove common prefixes
        path = path.replace('profile.php?id=', '')

        # Extract username
        if '/' in path:
            username = path.split('/')[0]
        else:
            username = path

        return username if username else None

    def _run_actor(self, actor_id: str, input_data: Dict) -> Optional[Dict]:
        """
        Run an Apify actor and wait for results.

        Args:
            actor_id: Actor ID (e.g., 'apify/instagram-profile-scraper')
            input_data: Input data for the actor

        Returns:
            Actor run result or None
        """
        try:
            # Convert actor_id format (apify/actor -> apify~actor)
            actor_id_formatted = actor_id.replace('/', '~')

            # Start actor run
            url = f"{self.BASE_URL}/acts/{actor_id_formatted}/runs"
            logger.info(f"Starting Apify actor: {actor_id_formatted}")

            response = self.session.post(url, json=input_data, timeout=30)
            response.raise_for_status()
            run_data = response.json()['data']

            run_id = run_data['id']
            logger.info(f"Actor run started: {run_id}")

            # Wait for completion (max 2 minutes)
            max_wait = 120
            start_time = time.time()

            while time.time() - start_time < max_wait:
                # Check run status
                status_url = f"{self.BASE_URL}/actor-runs/{run_id}"
                status_response = self.session.get(status_url, timeout=10)
                status_response.raise_for_status()
                status_data = status_response.json()['data']

                status = status_data['status']
                logger.info(f"Actor run status: {status}")

                if status == 'SUCCEEDED':
                    # Get dataset items
                    dataset_id = status_data['defaultDatasetId']
                    items_url = f"{self.BASE_URL}/datasets/{dataset_id}/items"
                    items_response = self.session.get(items_url, timeout=10)
                    items_response.raise_for_status()
                    items = items_response.json()

                    logger.info(f"Successfully retrieved {len(items)} items from actor run")
                    return items[0] if items else None

                elif status in ['FAILED', 'ABORTED', 'TIMED-OUT']:
                    logger.error(f"Actor run {status.lower()}")
                    return None

                # Wait before checking again
                time.sleep(3)

            logger.error(f"Actor run timed out after {max_wait} seconds")
            return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Error running Apify actor: {e}")
            return None

    def extract_colors_from_image(self, image_url: str, num_colors: int = 5) -> List[Dict]:
        """
        Extract dominant colors from an image URL.

        Args:
            image_url: URL of the image
            num_colors: Number of colors to extract

        Returns:
            List of color dictionaries with hex codes
        """
        try:
            # Download image
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()

            # Extract colors using ColorThief
            color_thief = ColorThief(BytesIO(response.content))
            palette = color_thief.get_palette(color_count=num_colors, quality=1)

            colors = []
            for idx, rgb in enumerate(palette):
                hex_color = f'#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}'
                colors.append({
                    'hex': hex_color,
                    'name': f'extracted-{idx + 1}',
                    'type': 'primary' if idx == 0 else 'accent',
                    'usage': 'primary' if idx == 0 else 'accent'
                })

            return colors

        except Exception as e:
            logger.error(f"Error extracting colors from image: {e}")
            return []

    def scrape_instagram_profile(self, profile_url: str) -> Optional[Dict]:
        """
        Scrape Instagram profile information.

        Args:
            profile_url: Instagram profile URL or username

        Returns:
            Profile data or None
        """
        username = self._extract_username_from_url(profile_url, 'instagram')
        if not username:
            logger.error(f"Could not extract username from URL: {profile_url}")
            return None

        # Prepare actor input
        input_data = {
            "usernames": [username],
            "resultsLimit": 1
        }

        logger.info(f"Scraping Instagram profile: @{username}")
        result = self._run_actor(self.INSTAGRAM_ACTOR, input_data)

        if not result:
            return None

        # Extract brand information
        brand_data = {
            'companyName': result.get('fullName') or result.get('username'),
            'description': result.get('biography', ''),
            'logoUrl': result.get('profilePicUrl') or result.get('profilePicUrlHd'),
            'websiteUrl': result.get('externalUrl'),
            'socialLinks': {
                'instagram': f"https://instagram.com/{username}"
            },
            'followerCount': result.get('followersCount', 0),
            'isVerified': result.get('verified', False),
            'isPrivate': result.get('private', False),
            'rawData': result
        }

        # Extract colors from profile picture
        if brand_data['logoUrl']:
            brand_data['brandColors'] = self.extract_colors_from_image(brand_data['logoUrl'])

        return brand_data

    def scrape_facebook_page(self, page_url: str) -> Optional[Dict]:
        """
        Scrape Facebook page information.

        Args:
            page_url: Facebook page URL

        Returns:
            Page data or None
        """
        # Extract page identifier
        page_id = self._extract_username_from_url(page_url, 'facebook')
        if not page_id:
            logger.error(f"Could not extract page ID from URL: {page_url}")
            return None

        # Prepare actor input
        input_data = {
            "startUrls": [{"url": page_url}],
            "maxPosts": 0  # We only want page info, not posts
        }

        logger.info(f"Scraping Facebook page: {page_id}")
        result = self._run_actor(self.FACEBOOK_ACTOR, input_data)

        if not result:
            return None

        # Extract brand information
        brand_data = {
            'companyName': result.get('name') or result.get('title'),
            'description': result.get('about') or result.get('description', ''),
            'logoUrl': result.get('profilePicture') or result.get('picture'),
            'websiteUrl': result.get('website'),
            'socialLinks': {
                'facebook': page_url
            },
            'followerCount': result.get('likes', 0),
            'isVerified': result.get('verified', False),
            'category': result.get('category'),
            'rawData': result
        }

        # Extract colors from profile picture
        if brand_data['logoUrl']:
            brand_data['brandColors'] = self.extract_colors_from_image(brand_data['logoUrl'])

        return brand_data

    def extract_all(self, url: str, platform: str) -> Optional[Dict]:
        """
        Extract brand information from social media profile.

        Args:
            url: Social media profile URL
            platform: Platform ('instagram' or 'facebook')

        Returns:
            Complete brand kit data or None
        """
        if platform == 'instagram':
            return self.scrape_instagram_profile(url)
        elif platform == 'facebook':
            return self.scrape_facebook_page(url)
        else:
            logger.error(f"Unsupported platform: {platform}")
            return None


# Example usage
if __name__ == '__main__':
    import json

    client = ApifyClient()

    # Test Instagram
    print("Testing Instagram extraction...")
    ig_result = client.scrape_instagram_profile('https://www.instagram.com/nike')

    if ig_result:
        print(json.dumps(ig_result, indent=2))
    else:
        print("Failed to extract Instagram profile")
