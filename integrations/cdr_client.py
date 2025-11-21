"""
Magnus Billing CDR (Call Detail Records) Client
Fetches call detail records from Magnus Billing / Asterisk CDR database
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import requests

logger = logging.getLogger(__name__)


class CDRClient:
    """
    Client for fetching CDR records from Magnus Billing

    Magnus Billing exposes CDR data through its API, typically stored
    in the pkg_cdr table from Asterisk.
    """

    def __init__(self, api_key: str, secret_key: str, base_url: str):
        """
        Initialize CDR client

        Args:
            api_key: Magnus Billing API key
            secret_key: Magnus Billing secret key
            base_url: Magnus API base URL (e.g., https://voice.epic.dm)
        """
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.verify = False  # Magnus may use self-signed cert

        logger.info(f"Initialized CDR client for {base_url}")

    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make API request to Magnus Billing

        Args:
            method: HTTP method (GET, POST)
            endpoint: API endpoint
            params: Query parameters

        Returns:
            Response data
        """
        url = f"{self.base_url}/index.php/api/{endpoint}"

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f"Basic {self.api_key}:{self.secret_key}",
            'User-Agent': 'Epic Voice CDR Client'
        }

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = self.session.post(url, headers=headers, json=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Magnus CDR API Error: {e}")
            return {'success': False, 'error': str(e)}

    def fetch_cdrs(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
        filters: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch CDR records from Magnus Billing

        Args:
            start_date: Start date for CDR query (default: 24 hours ago)
            end_date: End date for CDR query (default: now)
            limit: Maximum records to fetch
            offset: Records to skip (pagination)
            filters: Additional filters (e.g., {'accountcode': 'user123'})

        Returns:
            List of CDR records
        """
        # Default to last 24 hours if no dates specified
        if not start_date:
            start_date = datetime.now() - timedelta(days=1)
        if not end_date:
            end_date = datetime.now()

        # Build query parameters
        params = {
            'limit': limit,
            'offset': offset
        }

        # Add date filters
        # Magnus Billing uses filter[field][operator]=value format
        params['filter[calldate][>=]'] = start_date.strftime('%Y-%m-%d %H:%M:%S')
        params['filter[calldate][<=]'] = end_date.strftime('%Y-%m-%d %H:%M:%S')

        # Add custom filters
        if filters:
            for key, value in filters.items():
                params[f'filter[{key}]'] = value

        # Fetch CDRs via API
        try:
            response = self._make_request('GET', 'cdr', params)

            if response.get('success') and response.get('rows'):
                logger.info(f"✅ Fetched {len(response['rows'])} CDR records")
                return response['rows']
            elif response.get('rows') is not None:
                # Empty result set
                logger.info("No CDR records found for specified criteria")
                return []
            else:
                logger.error(f"CDR fetch failed: {response.get('error', 'Unknown error')}")
                return []

        except Exception as e:
            logger.error(f"Error fetching CDRs: {e}")
            return []

    def fetch_cdr_by_id(self, cdr_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch single CDR by ID

        Args:
            cdr_id: CDR unique ID

        Returns:
            CDR record or None
        """
        try:
            response = self._make_request('GET', f'cdr/{cdr_id}')

            if response.get('success'):
                return response
            else:
                logger.warning(f"CDR {cdr_id} not found")
                return None

        except Exception as e:
            logger.error(f"Error fetching CDR {cdr_id}: {e}")
            return None

    def fetch_recent_cdrs(self, hours: int = 24, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch CDRs from recent hours

        Args:
            hours: Number of hours to look back
            limit: Maximum records

        Returns:
            List of CDR records
        """
        start_date = datetime.now() - timedelta(hours=hours)
        return self.fetch_cdrs(start_date=start_date, limit=limit)

    def fetch_user_cdrs(
        self,
        accountcode: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch CDRs for specific user account

        Args:
            accountcode: Magnus user account code
            start_date: Start date
            end_date: End date
            limit: Maximum records

        Returns:
            List of CDR records
        """
        filters = {'accountcode': accountcode}
        return self.fetch_cdrs(
            start_date=start_date,
            end_date=end_date,
            filters=filters,
            limit=limit
        )

    def count_cdrs(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        filters: Optional[Dict] = None
    ) -> int:
        """
        Count CDRs matching criteria

        Args:
            start_date: Start date
            end_date: End date
            filters: Additional filters

        Returns:
            CDR count
        """
        # Default to last 24 hours
        if not start_date:
            start_date = datetime.now() - timedelta(days=1)
        if not end_date:
            end_date = datetime.now()

        params = {
            'count': 1,  # Request count only
            'filter[calldate][>=]': start_date.strftime('%Y-%m-%d %H:%M:%S'),
            'filter[calldate][<=]': end_date.strftime('%Y-%m-%d %H:%M:%S')
        }

        if filters:
            for key, value in filters.items():
                params[f'filter[{key}]'] = value

        try:
            response = self._make_request('GET', 'cdr', params)

            if response.get('total') is not None:
                return response['total']
            else:
                logger.warning("CDR count not available in response")
                return 0

        except Exception as e:
            logger.error(f"Error counting CDRs: {e}")
            return 0

    @staticmethod
    def parse_cdr_disposition(disposition: str) -> str:
        """
        Parse Asterisk CDR disposition to standardized outcome

        Asterisk Dispositions:
        - ANSWERED: Call was answered
        - NO ANSWER: Call was not answered
        - BUSY: Called party was busy
        - FAILED: Call failed to connect
        - CONGESTION: Network congestion

        Args:
            disposition: Raw Asterisk disposition

        Returns:
            Standardized outcome ('completed', 'no_answer', 'busy', 'failed')
        """
        disposition_upper = disposition.upper()

        if disposition_upper == 'ANSWERED':
            return 'completed'
        elif disposition_upper == 'NO ANSWER':
            return 'no_answer'
        elif disposition_upper == 'BUSY':
            return 'busy'
        elif disposition_upper in ('FAILED', 'CONGESTION'):
            return 'failed'
        else:
            # Unknown disposition, treat as failed
            return 'failed'


# Example usage for testing
if __name__ == '__main__':
    import os
    from dotenv import load_dotenv

    load_dotenv()

    # Initialize client
    client = CDRClient(
        api_key=os.getenv('MAGNUS_API_KEY', ''),
        secret_key=os.getenv('MAGNUS_SECRET_KEY', ''),
        base_url=os.getenv('MAGNUS_BASE_URL', 'https://voice.epic.dm')
    )

    # Fetch recent CDRs
    print("Fetching CDRs from last 24 hours...")
    cdrs = client.fetch_recent_cdrs(hours=24, limit=10)

    print(f"\n✅ Found {len(cdrs)} CDR records:\n")

    for cdr in cdrs[:5]:
        print(f"Call ID: {cdr.get('uniqueid')}")
        print(f"  Date: {cdr.get('calldate')}")
        print(f"  From: {cdr.get('src')} → To: {cdr.get('dst')}")
        print(f"  Duration: {cdr.get('duration')}s")
        print(f"  Disposition: {cdr.get('disposition')}")
        print()

    # Count total CDRs
    count = client.count_cdrs(start_date=datetime.now() - timedelta(days=7))
    print(f"📊 Total CDRs in last 7 days: {count}")
