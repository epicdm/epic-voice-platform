"""
CDR Sync Service
Pulls Call Detail Records from Magnus Billing/Asterisk and stores in local database

Features:
- Incremental sync (only new CDRs since last sync)
- Batch processing with pagination
- Duplicate detection via uniqueid
- User mapping via accountcode
- Outcome normalization
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from database import SessionLocal
from integrations.cdr_client import CDRClient

logger = logging.getLogger(__name__)


class CDRSyncService:
    """
    Sync service for pulling Magnus/Asterisk CDRs into local database

    Workflow:
    1. Determine sync window (since last sync or default 24h)
    2. Fetch CDRs from Magnus API in batches
    3. Map accountcode to user_id
    4. Normalize disposition to outcome
    5. Upsert CDR records (deduplicate by uniqueid)
    6. Track sync metadata
    """

    def __init__(
        self,
        user_id: str,
        magnus_api_key: str,
        magnus_secret_key: str,
        magnus_base_url: str,
        accountcode: Optional[str] = None
    ):
        """
        Initialize CDR sync service

        Args:
            user_id: Epic Voice user ID (for CDR ownership)
            magnus_api_key: Magnus API key
            magnus_secret_key: Magnus API secret
            magnus_base_url: Magnus API URL
            accountcode: Magnus accountcode to filter CDRs (optional)
        """
        self.user_id = user_id
        self.accountcode = accountcode
        self.cdr_client = CDRClient(
            api_key=magnus_api_key,
            secret_key=magnus_secret_key,
            base_url=magnus_base_url
        )

    def sync_cdrs(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        batch_size: int = 100,
        max_records: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Sync CDRs from Magnus Billing to local database

        Args:
            start_date: Start date for sync (None = last sync or 24h ago)
            end_date: End date for sync (None = now)
            batch_size: Records per batch
            max_records: Maximum records to sync (None = all)

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
            # Determine sync window
            if not start_date:
                start_date = self._get_last_sync_date() or (datetime.now() - timedelta(days=1))
            if not end_date:
                end_date = datetime.now()

            logger.info(f"🔄 Starting CDR sync from {start_date} to {end_date}")

            # Count total CDRs available
            filters = {'accountcode': self.accountcode} if self.accountcode else None
            total_cdrs = self.cdr_client.count_cdrs(
                start_date=start_date,
                end_date=end_date,
                filters=filters
            )

            logger.info(f"📊 Total CDRs available: {total_cdrs}")

            # Calculate number of batches
            cdrs_to_sync = min(max_records, total_cdrs) if max_records else total_cdrs
            num_batches = (cdrs_to_sync + batch_size - 1) // batch_size

            logger.info(f"🔄 Syncing {cdrs_to_sync} CDRs in {num_batches} batches")

            # Process in batches
            offset = 0
            for batch_num in range(num_batches):
                logger.info(f"📦 Processing batch {batch_num + 1}/{num_batches}")

                # Fetch batch
                cdrs = self.cdr_client.fetch_cdrs(
                    start_date=start_date,
                    end_date=end_date,
                    limit=batch_size,
                    offset=offset,
                    filters=filters
                )

                if not cdrs:
                    logger.warning(f"⚠️ No CDRs returned for batch {batch_num + 1}")
                    break

                results['total_fetched'] += len(cdrs)

                # Process each CDR
                for cdr in cdrs:
                    try:
                        result = self._sync_single_cdr(cdr)

                        if result == 'created':
                            results['created'] += 1
                        elif result == 'updated':
                            results['updated'] += 1
                        elif result == 'skipped':
                            results['skipped'] += 1

                    except Exception as e:
                        results['errors'] += 1
                        error_msg = f"CDR {cdr.get('uniqueid')}: {str(e)}"
                        results['error_details'].append(error_msg)
                        logger.error(f"❌ Error syncing CDR: {error_msg}")

                offset += batch_size

                # Stop if we've reached max_records
                if max_records and offset >= max_records:
                    break

            results['completed_at'] = datetime.now(timezone.utc)
            duration = (results['completed_at'] - results['started_at']).total_seconds()

            logger.info(f"""
✅ CDR sync completed in {duration:.1f}s
   📥 Fetched: {results['total_fetched']}
   ✅ Created: {results['created']}
   🔄 Updated: {results['updated']}
   ⏭️  Skipped: {results['skipped']}
   ❌ Errors: {results['errors']}
            """)

            # Update last sync timestamp
            self._update_last_sync()

            return results

        except Exception as e:
            logger.error(f"❌ CDR sync failed: {e}", exc_info=True)
            results['errors'] += 1
            results['error_details'].append(str(e))
            return results

    def _sync_single_cdr(self, magnus_cdr: Dict[str, Any]) -> str:
        """
        Sync single CDR record to database

        Args:
            magnus_cdr: CDR dict from Magnus API

        Returns:
            'created', 'updated', or 'skipped'
        """
        uniqueid = magnus_cdr.get('uniqueid')

        if not uniqueid:
            logger.debug(f"⏭️ Skipping CDR: No uniqueid")
            return 'skipped'

        # Normalize disposition to outcome
        disposition = magnus_cdr.get('disposition', 'FAILED')
        outcome = CDRClient.parse_cdr_disposition(disposition)

        # Build CDR data
        cdr_data = {
            'user_id': self.user_id,
            'uniqueid': uniqueid,
            'accountcode': magnus_cdr.get('accountcode'),
            'calldate': magnus_cdr.get('calldate'),
            'src': magnus_cdr.get('src'),
            'dst': magnus_cdr.get('dst'),
            'dcontext': magnus_cdr.get('dcontext'),
            'clid': magnus_cdr.get('clid'),
            'channel': magnus_cdr.get('channel'),
            'dstchannel': magnus_cdr.get('dstchannel'),
            'duration': int(magnus_cdr.get('sessiontime', 0) or magnus_cdr.get('duration', 0)),
            'billsec': int(magnus_cdr.get('sessionbill', 0) or magnus_cdr.get('billsec', 0)),
            'disposition': disposition,
            'outcome': outcome,
            'amaflags': magnus_cdr.get('amaflags'),
            'lastapp': magnus_cdr.get('lastapp'),
            'lastdata': magnus_cdr.get('lastdata'),
            'userfield': magnus_cdr.get('userfield'),
            'cost': float(magnus_cdr.get('sessionprice', 0) or magnus_cdr.get('cost', 0)),
            'description': magnus_cdr.get('description'),
            'magnus_cdr_id': magnus_cdr.get('id'),
            'id_user': magnus_cdr.get('id_user'),
            'terminatecauseid': magnus_cdr.get('terminatecauseid'),
            'raw_data': magnus_cdr  # Store complete CDR
        }

        # Upsert CDR
        db = SessionLocal()

        try:
            # Check if CDR exists
            existing = db.execute(
                text("""
                    SELECT id FROM asterisk_cdrs
                    WHERE user_id = :user_id AND uniqueid = :uniqueid
                    LIMIT 1
                """),
                {'user_id': self.user_id, 'uniqueid': uniqueid}
            ).fetchone()

            if existing:
                # Update existing CDR
                cdr_id = existing[0]

                db.execute(
                    text("""
                        UPDATE asterisk_cdrs SET
                            accountcode = :accountcode,
                            calldate = :calldate,
                            src = :src,
                            dst = :dst,
                            dcontext = :dcontext,
                            clid = :clid,
                            channel = :channel,
                            dstchannel = :dstchannel,
                            duration = :duration,
                            billsec = :billsec,
                            disposition = :disposition,
                            outcome = :outcome,
                            amaflags = :amaflags,
                            lastapp = :lastapp,
                            lastdata = :lastdata,
                            userfield = :userfield,
                            cost = :cost,
                            description = :description,
                            magnus_cdr_id = :magnus_cdr_id,
                            id_user = :id_user,
                            terminatecauseid = :terminatecauseid,
                            raw_data = :raw_data::jsonb,
                            synced_at = NOW()
                        WHERE id = :id
                    """),
                    {**cdr_data, 'id': cdr_id}
                )
                db.commit()
                logger.debug(f"🔄 Updated CDR {uniqueid}")
                return 'updated'

            else:
                # Create new CDR
                db.execute(
                    text("""
                        INSERT INTO asterisk_cdrs (
                            user_id, uniqueid, accountcode, calldate,
                            src, dst, dcontext, clid, channel, dstchannel,
                            duration, billsec, disposition, outcome,
                            amaflags, lastapp, lastdata, userfield,
                            cost, description, magnus_cdr_id, id_user,
                            terminatecauseid, raw_data
                        ) VALUES (
                            :user_id, :uniqueid, :accountcode, :calldate,
                            :src, :dst, :dcontext, :clid, :channel, :dstchannel,
                            :duration, :billsec, :disposition, :outcome,
                            :amaflags, :lastapp, :lastdata, :userfield,
                            :cost, :description, :magnus_cdr_id, :id_user,
                            :terminatecauseid, CAST(:raw_data AS jsonb)
                        )
                    """),
                    cdr_data
                )
                db.commit()
                logger.debug(f"✅ Created CDR {uniqueid}")
                return 'created'

        except Exception as e:
            db.rollback()
            logger.error(f"❌ Database error syncing CDR {uniqueid}: {e}")
            raise

        finally:
            db.close()

    def _get_last_sync_date(self) -> Optional[datetime]:
        """Get timestamp of last successful CDR sync for this user"""
        db = SessionLocal()

        try:
            result = db.execute(
                text("""
                    SELECT MAX(synced_at) FROM asterisk_cdrs
                    WHERE user_id = :user_id
                """),
                {'user_id': self.user_id}
            ).fetchone()

            if result and result[0]:
                return result[0]
            return None

        finally:
            db.close()

    def _update_last_sync(self):
        """Update last sync metadata (could be stored in user metadata or separate table)"""
        # For now, the synced_at timestamp on CDR records serves this purpose
        logger.debug(f"✅ CDR sync metadata updated for user {self.user_id}")


# Example usage for testing
if __name__ == '__main__':
    import os
    from dotenv import load_dotenv

    load_dotenv()

    # Test sync service
    sync_service = CDRSyncService(
        user_id='test-user-id',
        magnus_api_key=os.getenv('MAGNUS_API_KEY', ''),
        magnus_secret_key=os.getenv('MAGNUS_SECRET_KEY', ''),
        magnus_base_url=os.getenv('MAGNUS_BASE_URL', 'https://voice.epic.dm'),
        accountcode='test-account'
    )

    # Sync last 7 days of CDRs
    results = sync_service.sync_cdrs(
        start_date=datetime.now() - timedelta(days=7),
        batch_size=50,
        max_records=100
    )

    print("\n📊 CDR Sync Results:")
    print(f"   Total Fetched: {results['total_fetched']}")
    print(f"   Created: {results['created']}")
    print(f"   Updated: {results['updated']}")
    print(f"   Skipped: {results['skipped']}")
    print(f"   Errors: {results['errors']}")

    if results['error_details']:
        print("\n❌ Errors:")
        for error in results['error_details']:
            print(f"   - {error}")
