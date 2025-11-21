"""
Odoo CRM Integration - Contact Sync
Pulls contacts from Odoo CRM and syncs to local database

Supports Odoo 13+, tested with Odoo 15, 16, 17
"""
import xmlrpc.client
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class OdooClient:
    """
    Odoo API client for reading contacts

    Features:
    - Contact (res.partner) fetching
    - Phone number normalization
    - Batch contact retrieval

    API: XML-RPC (compatible with all Odoo versions)
    """

    def __init__(
        self,
        url: str,
        database: str,
        username: str,
        api_key: str = None,
        password: str = None
    ):
        """
        Initialize Odoo connection

        Args:
            url: Odoo instance URL (e.g., https://mycompany.odoo.com)
            database: Database name
            username: User login
            api_key: API key (Odoo 15+, preferred)
            password: Password (legacy auth)
        """
        self.url = url.rstrip('/')
        self.database = database
        self.username = username
        self.api_key = api_key
        self.password = password
        self.uid = None

        # XML-RPC endpoints
        self.common_endpoint = f"{self.url}/xmlrpc/2/common"
        self.object_endpoint = f"{self.url}/xmlrpc/2/object"

        logger.info(f"Initialized Odoo client for {self.url}")

    def authenticate(self) -> bool:
        """
        Authenticate with Odoo and get user ID

        Returns:
            True if authentication successful
        """
        try:
            common = xmlrpc.client.ServerProxy(self.common_endpoint)
            self.uid = common.authenticate(
                self.database,
                self.username,
                self.api_key or self.password,
                {}
            )

            if self.uid:
                logger.info(f"✅ Authenticated with Odoo as user {self.uid}")
                return True
            else:
                logger.error("❌ Odoo authentication failed: No user ID returned")
                return False

        except Exception as e:
            logger.error(f"❌ Odoo authentication failed: {e}")
            return False

    def fetch_contacts(
        self,
        limit: int = 100,
        offset: int = 0,
        filters: List[Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch contacts from Odoo CRM

        Args:
            limit: Maximum number of contacts to fetch
            offset: Number of records to skip
            filters: Odoo domain filters (e.g., [('is_company', '=', False)])

        Returns:
            List of contact dictionaries
        """
        if not self.uid:
            logger.error("Not authenticated with Odoo")
            return []

        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            # Default filters: only fetch contacts (not companies) with phone numbers
            if filters is None:
                filters = [
                    '|',
                    ('phone', '!=', False),
                    ('mobile', '!=', False),
                    ('is_company', '=', False)  # Only people, not companies
                ]

            # Search for contact IDs
            contact_ids = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'res.partner',
                'search',
                [filters],
                {'limit': limit, 'offset': offset}
            )

            if not contact_ids:
                logger.info("No contacts found in Odoo")
                return []

            # Read contact details
            fields = [
                'id',
                'name',
                'phone',
                'mobile',
                'email',
                'company_name',
                'comment',  # Notes
                'create_date',
                'write_date',
                'user_id',  # Assigned user
                'category_id'  # Tags
            ]

            contacts = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'res.partner',
                'read',
                [contact_ids],
                {'fields': fields}
            )

            logger.info(f"✅ Fetched {len(contacts)} contacts from Odoo")
            return contacts

        except Exception as e:
            logger.error(f"❌ Error fetching Odoo contacts: {e}")
            return []

    def fetch_contact_by_id(self, contact_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch single contact by Odoo ID

        Args:
            contact_id: Odoo contact ID

        Returns:
            Contact dictionary or None
        """
        if not self.uid:
            logger.error("Not authenticated with Odoo")
            return None

        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            fields = [
                'id',
                'name',
                'phone',
                'mobile',
                'email',
                'company_name',
                'comment',
                'create_date',
                'write_date'
            ]

            contacts = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'res.partner',
                'read',
                [[contact_id]],
                {'fields': fields}
            )

            return contacts[0] if contacts else None

        except Exception as e:
            logger.error(f"❌ Error fetching Odoo contact {contact_id}: {e}")
            return None

    def count_contacts(self, filters: List[Any] = None) -> int:
        """
        Count total contacts matching filters

        Args:
            filters: Odoo domain filters

        Returns:
            Contact count
        """
        if not self.uid:
            logger.error("Not authenticated with Odoo")
            return 0

        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            if filters is None:
                filters = [
                    '|',
                    ('phone', '!=', False),
                    ('mobile', '!=', False),
                    ('is_company', '=', False)
                ]

            count = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'res.partner',
                'search_count',
                [filters]
            )

            logger.info(f"📊 Total contacts in Odoo: {count}")
            return count

        except Exception as e:
            logger.error(f"❌ Error counting Odoo contacts: {e}")
            return 0

    @staticmethod
    def normalize_phone_number(phone: str) -> str:
        """
        Normalize phone number to E.164 format

        Args:
            phone: Raw phone number from Odoo

        Returns:
            Normalized phone number (+1XXXXXXXXXX)
        """
        if not phone:
            return ""

        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, phone))

        # Handle US numbers
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith('1'):
            return f"+{digits}"
        else:
            # Return with + prefix for international
            return f"+{digits}"

    def test_connection(self) -> bool:
        """
        Test Odoo connection and permissions

        Returns:
            True if connection successful
        """
        try:
            if not self.authenticate():
                return False

            # Try to count contacts as a permission test
            count = self.count_contacts()

            if count >= 0:
                logger.info(f"✅ Odoo connection test successful ({count} contacts)")
                return True
            else:
                logger.error("❌ Odoo connection test failed: Unable to count contacts")
                return False

        except Exception as e:
            logger.error(f"❌ Odoo connection test failed: {e}")
            return False


# Example usage for testing
if __name__ == '__main__':
    import os
    from dotenv import load_dotenv

    load_dotenv()

    # Test Odoo connection
    client = OdooClient(
        url=os.getenv('ODOO_URL', 'https://demo.odoo.com'),
        database=os.getenv('ODOO_DATABASE', 'demo'),
        username=os.getenv('ODOO_USERNAME', 'admin'),
        api_key=os.getenv('ODOO_API_KEY'),
        password=os.getenv('ODOO_PASSWORD')
    )

    # Test connection
    if client.test_connection():
        print("✅ Connection successful!")

        # Fetch first 10 contacts
        contacts = client.fetch_contacts(limit=10)
        print(f"\nFetched {len(contacts)} contacts:")

        for contact in contacts[:3]:
            print(f"\n  - {contact['name']}")
            print(f"    Phone: {contact.get('phone', 'N/A')}")
            print(f"    Email: {contact.get('email', 'N/A')}")
    else:
        print("❌ Connection failed!")
