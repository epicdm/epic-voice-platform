"""
Odoo Contact Sync Service
Pulls contacts from Odoo CRM and syncs them to local leads table

Features:
- One-way sync (Odoo → Epic Voice)
- Batch processing with pagination
- Duplicate detection via phone number
- Metadata preservation (Odoo ID, timestamps)
- Sync status tracking
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy import text
from database import SessionLocal
from integrations.odoo_client import OdooClient

logger = logging.getLogger(__name__)


class OdooSyncService:
    """
    Sync service for pulling Odoo contacts into leads table

    Workflow:
    1. Authenticate with Odoo
    2. Fetch contacts in batches
    3. Map Odoo contacts to leads schema
    4. Upsert leads (create or update by phone number)
    5. Track sync metadata and status
    """

    def __init__(
        self,
        user_id: str,
        odoo_url: str,
        odoo_database: str,
        odoo_username: str,
        odoo_api_key: str = None,
        odoo_password: str = None
    ):
        """
        Initialize sync service

        Args:
            user_id: Epic Voice user ID (for lead ownership)
            odoo_url: Odoo instance URL
            odoo_database: Odoo database name
            odoo_username: Odoo username
            odoo_api_key: Odoo API key (preferred)
            odoo_password: Odoo password (fallback)
        """
        self.user_id = user_id
        self.odoo_client = OdooClient(
            url=odoo_url,
            database=odoo_database,
            username=odoo_username,
            api_key=odoo_api_key,
            password=odoo_password
        )

    def sync_contacts(
        self,
        batch_size: int = 100,
        max_contacts: int = None
    ) -> Dict[str, Any]:
        """
        Sync contacts from Odoo to leads table

        Args:
            batch_size: Number of contacts per batch
            max_contacts: Maximum contacts to sync (None = all)

        Returns:
            Sync results summary
        """
        results = {
            'started_at': datetime.now(timezone.utc),
            'total_fetched': 0,
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
            'error_details': []
        }

        try:
            # Authenticate with Odoo
            if not self.odoo_client.authenticate():
                logger.error("❌ Failed to authenticate with Odoo")
                results['errors'] = 1
                results['error_details'].append("Authentication failed")
                return results

            # Count total contacts
            total_contacts = self.odoo_client.count_contacts()
            logger.info(f"📊 Total contacts in Odoo: {total_contacts}")

            # Calculate number of batches
            contacts_to_sync = min(max_contacts, total_contacts) if max_contacts else total_contacts
            num_batches = (contacts_to_sync + batch_size - 1) // batch_size

            logger.info(f"🔄 Starting sync: {contacts_to_sync} contacts in {num_batches} batches")

            # Process in batches
            offset = 0
            for batch_num in range(num_batches):
                logger.info(f"📦 Processing batch {batch_num + 1}/{num_batches}")

                # Fetch batch
                contacts = self.odoo_client.fetch_contacts(
                    limit=batch_size,
                    offset=offset
                )

                if not contacts:
                    logger.warning(f"⚠️ No contacts returned for batch {batch_num + 1}")
                    break

                results['total_fetched'] += len(contacts)

                # Process each contact
                for contact in contacts:
                    try:
                        result = self._sync_single_contact(contact)

                        if result == 'created':
                            results['created'] += 1
                        elif result == 'updated':
                            results['updated'] += 1
                        elif result == 'skipped':
                            results['skipped'] += 1

                    except Exception as e:
                        results['errors'] += 1
                        error_msg = f"Contact {contact.get('id')}: {str(e)}"
                        results['error_details'].append(error_msg)
                        logger.error(f"❌ Error syncing contact: {error_msg}")

                offset += batch_size

                # Stop if we've reached max_contacts
                if max_contacts and offset >= max_contacts:
                    break

            results['completed_at'] = datetime.now(timezone.utc)
            duration = (results['completed_at'] - results['started_at']).total_seconds()

            logger.info(f"""
✅ Odoo sync completed in {duration:.1f}s
   📥 Fetched: {results['total_fetched']}
   ✅ Created: {results['created']}
   🔄 Updated: {results['updated']}
   ⏭️  Skipped: {results['skipped']}
   ❌ Errors: {results['errors']}
            """)

            # Update last_synced_at in crm_connections
            self._update_last_synced()

            return results

        except Exception as e:
            logger.error(f"❌ Sync failed: {e}", exc_info=True)
            results['errors'] += 1
            results['error_details'].append(str(e))
            return results

    def _sync_single_contact(self, odoo_contact: Dict[str, Any]) -> str:
        """
        Sync single Odoo contact to leads table

        Args:
            odoo_contact: Odoo contact dict

        Returns:
            'created', 'updated', or 'skipped'
        """
        # Extract phone number (prefer mobile over phone)
        phone = odoo_contact.get('mobile') or odoo_contact.get('phone')

        if not phone:
            logger.debug(f"⏭️  Skipping contact {odoo_contact['id']}: No phone number")
            return 'skipped'

        # Normalize phone number
        phone_normalized = OdooClient.normalize_phone_number(phone)

        # Parse name
        full_name = odoo_contact.get('name', '').strip()
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0] if name_parts else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Build metadata
        metadata = {
            'odoo_id': odoo_contact['id'],
            'odoo_created_at': odoo_contact.get('create_date'),
            'odoo_updated_at': odoo_contact.get('write_date'),
            'odoo_user_id': odoo_contact.get('user_id'),
            'odoo_category_id': odoo_contact.get('category_id'),
            'odoo_comment': odoo_contact.get('comment'),
            'synced_at': datetime.now(timezone.utc).isoformat()
        }

        # Upsert lead
        db = SessionLocal()

        try:
            # Check if lead exists (by user_id + phone_number)
            existing = db.execute(
                text("""
                    SELECT id, metadata FROM leads
                    WHERE user_id = :user_id AND phone_number = :phone
                    LIMIT 1
                """),
                {'user_id': self.user_id, 'phone': phone_normalized}
            ).fetchone()

            if existing:
                # Update existing lead
                lead_id = existing[0]

                # Merge existing metadata with new Odoo data
                existing_metadata = existing[1] or {}
                merged_metadata = {**existing_metadata, **metadata}

                db.execute(
                    text("""
                        UPDATE leads SET
                            first_name = COALESCE(first_name, :first_name),
                            last_name = COALESCE(last_name, :last_name),
                            email = COALESCE(email, :email),
                            company = COALESCE(company, :company),
                            source = COALESCE(source, :source),
                            metadata = :metadata::jsonb,
                            updated_at = NOW()
                        WHERE id = :id
                    """),
                    {
                        'id': lead_id,
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': odoo_contact.get('email'),
                        'company': odoo_contact.get('company_name'),
                        'source': 'odoo',
                        'metadata': merged_metadata
                    }
                )
                db.commit()
                logger.debug(f"🔄 Updated lead {lead_id} from Odoo contact {odoo_contact['id']}")
                return 'updated'

            else:
                # Create new lead
                lead_id = db.execute(
                    text("""
                        INSERT INTO leads (
                            user_id, phone_number, first_name, last_name,
                            email, company, source, metadata, status
                        ) VALUES (
                            :user_id, :phone, :first_name, :last_name,
                            :email, :company, :source, :metadata::jsonb, :status
                        )
                        RETURNING id
                    """),
                    {
                        'user_id': self.user_id,
                        'phone': phone_normalized,
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': odoo_contact.get('email'),
                        'company': odoo_contact.get('company_name'),
                        'source': 'odoo',
                        'metadata': metadata,
                        'status': 'new'
                    }
                ).fetchone()[0]
                db.commit()
                logger.debug(f"✅ Created lead {lead_id} from Odoo contact {odoo_contact['id']}")
                return 'created'

        except Exception as e:
            db.rollback()
            logger.error(f"❌ Database error syncing contact {odoo_contact['id']}: {e}")
            raise

        finally:
            db.close()

    def test_connection(self) -> bool:
        """
        Test Odoo connection

        Returns:
            True if connection successful
        """
        return self.odoo_client.test_connection()

    def _update_last_synced(self):
        """Update last_synced_at timestamp in crm_connections table"""
        db = SessionLocal()

        try:
            db.execute(
                text("""
                    UPDATE crm_connections SET
                        last_synced_at = NOW()
                    WHERE user_id = :user_id AND provider = 'odoo'
                """),
                {'user_id': self.user_id}
            )
            db.commit()
            logger.debug(f"✅ Updated last_synced_at for user {self.user_id}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating last_synced_at: {e}")

        finally:
            db.close()


# Example usage for testing
if __name__ == '__main__':
    import os
    from dotenv import load_dotenv

    load_dotenv()

    # Test sync service
    sync_service = OdooSyncService(
        user_id='test-user-id',
        odoo_url=os.getenv('ODOO_URL', 'https://demo.odoo.com'),
        odoo_database=os.getenv('ODOO_DATABASE', 'demo'),
        odoo_username=os.getenv('ODOO_USERNAME', 'admin'),
        odoo_api_key=os.getenv('ODOO_API_KEY'),
        odoo_password=os.getenv('ODOO_PASSWORD')
    )

    # Test connection
    if sync_service.test_connection():
        print("✅ Connection test passed!")

        # Sync first 10 contacts
        results = sync_service.sync_contacts(batch_size=10, max_contacts=10)

        print("\n📊 Sync Results:")
        print(f"   Total Fetched: {results['total_fetched']}")
        print(f"   Created: {results['created']}")
        print(f"   Updated: {results['updated']}")
        print(f"   Skipped: {results['skipped']}")
        print(f"   Errors: {results['errors']}")

        if results['error_details']:
            print("\n❌ Errors:")
            for error in results['error_details']:
                print(f"   - {error}")
    else:
        print("❌ Connection test failed!")
