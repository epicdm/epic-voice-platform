"""
Brand Kit Service
Business logic for managing brand kits and extracting brand information
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from database import BrandKit
from backend.brand_kit.brandfetch_client import BrandfetchClient
from backend.brand_kit.apify_client import ApifyClient

logger = logging.getLogger(__name__)


class BrandKitService:
    """Service for managing brand kits."""

    def __init__(self):
        """Initialize the service."""
        self.brandfetch_client = BrandfetchClient()
        self.apify_client = ApifyClient()

    def create_brand_kit(
        self,
        db: Session,
        user_id: str,
        name: str,
        source_type: str = 'manual',
        source_url: Optional[str] = None,
        is_default: bool = False,
        **kwargs
    ) -> BrandKit:
        """
        Create a new brand kit.

        Args:
            db: Database session
            user_id: User ID
            name: Brand kit name
            source_type: Type of source ('website', 'facebook', 'instagram', 'manual')
            source_url: URL to extract from (if applicable)
            is_default: Whether this should be the default brand kit
            **kwargs: Additional brand kit fields

        Returns:
            Created BrandKit instance
        """
        try:
            # Create brand kit
            brand_kit = BrandKit(
                userId=user_id,
                name=name,
                sourceType=source_type,
                sourceUrl=source_url,
                isDefault=is_default,
                extractionStatus='manual',
                **kwargs
            )

            db.add(brand_kit)
            db.commit()
            db.refresh(brand_kit)

            logger.info(f"Created brand kit '{name}' for user {user_id}")
            return brand_kit

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating brand kit: {e}")
            raise

    def extract_from_website(
        self,
        db: Session,
        user_id: str,
        website_url: str,
        name: Optional[str] = None,
        is_default: bool = False
    ) -> Optional[BrandKit]:
        """
        Extract brand information from a website and create a brand kit.

        Args:
            db: Database session
            user_id: User ID
            website_url: Website URL to extract from
            name: Brand kit name (defaults to company name from extraction)
            is_default: Whether this should be the default brand kit

        Returns:
            Created BrandKit instance or None if extraction failed
        """
        try:
            logger.info(f"Extracting brand info from website: {website_url}")

            # Extract brand data using Brandfetch or Apify
            try:
                brand_data = self.brandfetch_client.extract_all(website_url)
            except ValueError as ve:
                # Check if this is a social media URL
                error_msg = str(ve)
                if error_msg.startswith('social_media:'):
                    platform = error_msg.split(':')[1]
                    logger.info(f"Detected {platform} profile, using Apify for extraction")

                    # Use Apify for social media extraction
                    brand_data = self.apify_client.extract_all(website_url, platform)

                    if not brand_data:
                        logger.error(f"Failed to extract {platform} profile data from {website_url}")
                        raise ValueError(f"Failed to extract brand information from {platform} profile. Please ensure the profile is public and try again.")
                else:
                    # Other validation error
                    logger.warning(f"Validation error for {website_url}: {ve}")
                    raise

            if not brand_data:
                logger.error(f"Failed to extract brand data from {website_url}")
                return None

            # Use extracted company name as default name
            brand_kit_name = name or brand_data.get('companyName', 'My Brand')

            # Create brand kit with extracted data
            brand_kit = BrandKit(
                userId=user_id,
                name=brand_kit_name,
                sourceType='website',
                sourceUrl=website_url,
                isDefault=is_default,
                logoUrl=brand_data.get('logoUrl'),
                logoSvg=brand_data.get('logoSvg'),
                brandColors=brand_data.get('brandColors', []),
                fonts=brand_data.get('fonts', []),
                companyName=brand_data.get('companyName'),
                description=brand_data.get('description'),
                industry=brand_data.get('industry'),
                websiteUrl=brand_data.get('websiteUrl'),
                socialLinks=brand_data.get('socialLinks', {}),
                extractionStatus='completed',
                extractionMetadata=brand_data.get('extractionMetadata', {}),
                lastSyncedAt=datetime.utcnow()
            )

            db.add(brand_kit)
            db.commit()
            db.refresh(brand_kit)

            logger.info(f"Successfully created brand kit '{brand_kit_name}' from {website_url}")
            return brand_kit

        except ValueError:
            # Re-raise ValueError (validation errors) to routes layer
            raise
        except Exception as e:
            db.rollback()

            # Check for duplicate name error
            if 'unique_user_brand_name' in str(e):
                logger.warning(f"Duplicate brand kit name for user {user_id}")
                raise ValueError('A brand kit with this name already exists. Please choose a different name.')

            logger.error(f"Error extracting brand from website: {e}", exc_info=True)
            return None

    def get_brand_kit(self, db: Session, brand_kit_id: str, user_id: str) -> Optional[BrandKit]:
        """
        Get a brand kit by ID.

        Args:
            db: Database session
            brand_kit_id: Brand kit ID
            user_id: User ID (for authorization)

        Returns:
            BrandKit instance or None
        """
        return db.query(BrandKit).filter(
            BrandKit.id == brand_kit_id,
            BrandKit.userId == user_id
        ).first()

    def list_brand_kits(self, db: Session, user_id: str) -> List[BrandKit]:
        """
        List all brand kits for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of BrandKit instances
        """
        return db.query(BrandKit).filter(
            BrandKit.userId == user_id
        ).order_by(BrandKit.isDefault.desc(), BrandKit.createdAt.desc()).all()

    def get_default_brand_kit(self, db: Session, user_id: str) -> Optional[BrandKit]:
        """
        Get user's default brand kit.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Default BrandKit or None
        """
        return db.query(BrandKit).filter(
            BrandKit.userId == user_id,
            BrandKit.isDefault == True
        ).first()

    def update_brand_kit(
        self,
        db: Session,
        brand_kit_id: str,
        user_id: str,
        **updates
    ) -> Optional[BrandKit]:
        """
        Update a brand kit.

        Args:
            db: Database session
            brand_kit_id: Brand kit ID
            user_id: User ID (for authorization)
            **updates: Fields to update

        Returns:
            Updated BrandKit or None
        """
        try:
            brand_kit = self.get_brand_kit(db, brand_kit_id, user_id)
            if not brand_kit:
                return None

            for key, value in updates.items():
                if hasattr(brand_kit, key):
                    setattr(brand_kit, key, value)

            db.commit()
            db.refresh(brand_kit)

            logger.info(f"Updated brand kit {brand_kit_id}")
            return brand_kit

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating brand kit: {e}")
            raise

    def set_default_brand_kit(
        self,
        db: Session,
        brand_kit_id: str,
        user_id: str
    ) -> Optional[BrandKit]:
        """
        Set a brand kit as the default for a user.

        Args:
            db: Database session
            brand_kit_id: Brand kit ID
            user_id: User ID

        Returns:
            Updated BrandKit or None
        """
        try:
            brand_kit = self.get_brand_kit(db, brand_kit_id, user_id)
            if not brand_kit:
                return None

            # Unset other defaults (handled by trigger, but being explicit)
            db.query(BrandKit).filter(
                BrandKit.userId == user_id,
                BrandKit.id != brand_kit_id
            ).update({'isDefault': False})

            # Set this as default
            brand_kit.isDefault = True

            db.commit()
            db.refresh(brand_kit)

            logger.info(f"Set brand kit {brand_kit_id} as default for user {user_id}")
            return brand_kit

        except Exception as e:
            db.rollback()
            logger.error(f"Error setting default brand kit: {e}")
            raise

    def delete_brand_kit(
        self,
        db: Session,
        brand_kit_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a brand kit.

        Args:
            db: Database session
            brand_kit_id: Brand kit ID
            user_id: User ID (for authorization)

        Returns:
            True if deleted, False otherwise
        """
        try:
            brand_kit = self.get_brand_kit(db, brand_kit_id, user_id)
            if not brand_kit:
                return False

            db.delete(brand_kit)
            db.commit()

            logger.info(f"Deleted brand kit {brand_kit_id}")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting brand kit: {e}")
            raise

    def refresh_brand_kit(
        self,
        db: Session,
        brand_kit_id: str,
        user_id: str
    ) -> Optional[BrandKit]:
        """
        Re-extract brand information from source URL.

        Args:
            db: Database session
            brand_kit_id: Brand kit ID
            user_id: User ID

        Returns:
            Updated BrandKit or None
        """
        try:
            brand_kit = self.get_brand_kit(db, brand_kit_id, user_id)
            if not brand_kit:
                return None

            if not brand_kit.sourceUrl or brand_kit.sourceType not in ['website', 'facebook', 'instagram']:
                logger.warning(f"Cannot refresh brand kit {brand_kit_id}: no source URL or unsupported type")
                return brand_kit

            # Re-extract
            logger.info(f"Refreshing brand kit {brand_kit_id} from {brand_kit.sourceUrl}")
            brand_data = self.brandfetch_client.extract_all(brand_kit.sourceUrl)

            if not brand_data:
                logger.error(f"Failed to refresh brand data for {brand_kit_id}")
                brand_kit.extractionStatus = 'failed'
                brand_kit.extractionMetadata = {
                    'error': 'Failed to fetch brand data',
                    'last_attempt': datetime.utcnow().isoformat()
                }
                db.commit()
                return brand_kit

            # Update with fresh data
            brand_kit.logoUrl = brand_data.get('logoUrl') or brand_kit.logoUrl
            brand_kit.logoSvg = brand_data.get('logoSvg') or brand_kit.logoSvg
            brand_kit.brandColors = brand_data.get('brandColors', [])
            brand_kit.fonts = brand_data.get('fonts', [])
            brand_kit.companyName = brand_data.get('companyName') or brand_kit.companyName
            brand_kit.description = brand_data.get('description') or brand_kit.description
            brand_kit.industry = brand_data.get('industry') or brand_kit.industry
            brand_kit.socialLinks = brand_data.get('socialLinks', {})
            brand_kit.extractionStatus = 'completed'
            brand_kit.extractionMetadata = brand_data.get('extractionMetadata', {})
            brand_kit.lastSyncedAt = datetime.utcnow()

            db.commit()
            db.refresh(brand_kit)

            logger.info(f"Successfully refreshed brand kit {brand_kit_id}")
            return brand_kit

        except Exception as e:
            db.rollback()
            logger.error(f"Error refreshing brand kit: {e}", exc_info=True)
            raise
