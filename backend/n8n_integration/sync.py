"""
Funnel to n8n Auto-Sync Service

Automatically synchronizes funnels to n8n workflows when created or updated.
Maintains bidirectional mapping between funnel IDs and n8n workflow IDs.
"""

import logging
import os
from typing import Optional
from sqlalchemy.orm import Session

from .client import N8nClient
from .translator import translate_funnel_to_n8n

# Import funnel models
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from backend.funnel_engine.models import Funnel, FunnelNode, FunnelEdge

logger = logging.getLogger(__name__)


class N8nSyncService:
    """Service for syncing funnels to n8n workflows"""

    def __init__(
        self,
        n8n_url: str = None,
        n8n_api_key: str = None,
        livekit_api_url: str = "https://ai.epic.dm"
    ):
        """
        Initialize sync service

        Args:
            n8n_url: n8n instance URL (default from env)
            n8n_api_key: n8n API key (default from env)
            livekit_api_url: LiveKit API URL for workflow calls
        """
        self.n8n_url = n8n_url or os.getenv("N8N_URL", "https://n8n.ai.epic.dm")
        self.n8n_api_key = n8n_api_key or os.getenv("N8N_API_KEY")
        self.livekit_api_url = livekit_api_url

        if not self.n8n_api_key:
            logger.warning("⚠️  N8N_API_KEY not configured - auto-sync will be disabled")
            self.enabled = False
        else:
            self.client = N8nClient(self.n8n_url, self.n8n_api_key)
            self.enabled = True
            logger.info(f"✅ n8n auto-sync enabled: {self.n8n_url}")

    def sync_funnel(self, db: Session, funnel_id: str, auto_activate: bool = True) -> Optional[str]:
        """
        Sync a funnel to n8n with validation and optional auto-activation

        Args:
            db: Database session
            funnel_id: Funnel ID to sync
            auto_activate: If True and funnel is ACTIVE, activate workflow after sync

        Returns:
            n8n workflow ID if successful, None otherwise
        """
        if not self.enabled:
            logger.debug(f"Auto-sync disabled, skipping funnel {funnel_id}")
            return None

        try:
            # 1. Load funnel from database
            funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
            if not funnel:
                logger.error(f"❌ Funnel not found: {funnel_id}")
                return None

            # 2. Load nodes and edges
            nodes = db.query(FunnelNode).filter(FunnelNode.funnel_id == funnel_id).all()
            edges = db.query(FunnelEdge).filter(FunnelEdge.funnel_id == funnel_id).all()

            logger.info(f"🔄 Syncing funnel: {funnel.name} ({len(nodes)} nodes, {len(edges)} edges)")

            # 3. Translate to n8n workflow
            workflow_json = translate_funnel_to_n8n(
                funnel, nodes, edges, self.livekit_api_url
            )

            # 4. VALIDATE workflow before creating/updating
            validation_result = self.client.validate_workflow(workflow_json)

            if not validation_result["valid"]:
                logger.error(f"❌ Workflow validation failed:")
                for error in validation_result["errors"]:
                    logger.error(f"  - {error}")

                # Store validation errors in funnel settings
                settings = funnel.settings or {}
                settings["n8n_validation_errors"] = validation_result["errors"]
                settings["n8n_validation_warnings"] = validation_result["warnings"]
                funnel.settings = settings
                db.commit()

                return None

            # Log warnings (non-fatal)
            if validation_result["warnings"]:
                logger.warning(f"⚠️  Workflow has {len(validation_result['warnings'])} warnings:")
                for warning in validation_result["warnings"]:
                    logger.warning(f"  - {warning}")

                # Store warnings in funnel settings
                settings = funnel.settings or {}
                settings["n8n_validation_warnings"] = validation_result["warnings"]
                settings["n8n_validation_errors"] = []  # Clear previous errors
                funnel.settings = settings

            # 5. Create or update in n8n
            if funnel.n8n_workflow_id:
                # Update existing workflow
                logger.info(f"  📝 Updating existing n8n workflow: {funnel.n8n_workflow_id}")
                workflow = self.client.update_workflow(funnel.n8n_workflow_id, workflow_json)
            else:
                # Create new workflow
                logger.info(f"  ➕ Creating new n8n workflow")
                workflow = self.client.create_workflow(workflow_json)

                # Store n8n workflow ID in funnel
                funnel.n8n_workflow_id = workflow.get("id")

            # 6. Extract and store webhook URL
            workflow_id = workflow.get("id")
            if workflow_id:
                webhook_url = self.client.get_webhook_url(workflow_id)
                if webhook_url:
                    funnel.n8n_webhook_url = webhook_url
                    logger.info(f"  📌 Stored webhook URL: {webhook_url}")
                else:
                    logger.warning(f"  ⚠️  No webhook URL found for workflow {workflow_id}")

            # 7. AUTO-ACTIVATE if funnel is ACTIVE (CRITICAL FIX!)
            if auto_activate and funnel.status.value == "active":  # Use .value for enum
                logger.info(f"  🟢 Funnel is ACTIVE - activating workflow automatically")
                activation_success = self.client.activate_workflow(workflow_id)

                if activation_success:
                    # Verify activation succeeded
                    status = self.client.check_workflow_status(workflow_id)
                    if status and status.get("active"):
                        logger.info(f"  ✅ Workflow activated successfully in n8n")
                    else:
                        logger.warning(f"  ⚠️  Workflow activation returned success but status check shows inactive")
                else:
                    logger.error(f"  ❌ Failed to activate workflow - funnel will not trigger automatically!")

            db.commit()

            logger.info(f"✅ Funnel synced to n8n: {workflow_id}")
            return workflow_id

        except Exception as e:
            logger.error(f"❌ Error syncing funnel to n8n: {e}")
            import traceback
            traceback.print_exc()

            # Store error in funnel settings
            try:
                settings = funnel.settings or {}
                settings["n8n_sync_error"] = str(e)
                funnel.settings = settings
                db.commit()
            except:
                pass

            return None

    def delete_workflow(self, db: Session, funnel_id: str) -> bool:
        """
        Delete n8n workflow when funnel is deleted

        Args:
            db: Database session
            funnel_id: Funnel ID

        Returns:
            True if successful
        """
        if not self.enabled:
            return True

        try:
            # Load funnel to get n8n workflow ID
            funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
            if not funnel or not funnel.n8n_workflow_id:
                return True

            logger.info(f"🗑️  Deleting n8n workflow: {funnel.n8n_workflow_id}")
            return self.client.delete_workflow(funnel.n8n_workflow_id)

        except Exception as e:
            logger.error(f"❌ Error deleting n8n workflow: {e}")
            return False

    def activate_workflow(self, db: Session, funnel_id: str) -> bool:
        """
        Activate n8n workflow when funnel is activated

        Args:
            db: Database session
            funnel_id: Funnel ID

        Returns:
            True if successful
        """
        if not self.enabled:
            return True

        try:
            funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
            if not funnel or not funnel.n8n_workflow_id:
                logger.warning(f"⚠️  Cannot activate: funnel has no n8n workflow")
                return False

            logger.info(f"🟢 Activating n8n workflow: {funnel.n8n_workflow_id}")
            return self.client.activate_workflow(funnel.n8n_workflow_id)

        except Exception as e:
            logger.error(f"❌ Error activating n8n workflow: {e}")
            return False

    def deactivate_workflow(self, db: Session, funnel_id: str) -> bool:
        """
        Deactivate n8n workflow when funnel is paused/archived

        Args:
            db: Database session
            funnel_id: Funnel ID

        Returns:
            True if successful
        """
        if not self.enabled:
            return True

        try:
            funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
            if not funnel or not funnel.n8n_workflow_id:
                return True

            logger.info(f"⚪ Deactivating n8n workflow: {funnel.n8n_workflow_id}")
            return self.client.deactivate_workflow(funnel.n8n_workflow_id)

        except Exception as e:
            logger.error(f"❌ Error deactivating n8n workflow: {e}")
            return False


# Global singleton instance
_sync_service: Optional[N8nSyncService] = None


def get_sync_service() -> N8nSyncService:
    """
    Get global sync service instance

    Returns:
        N8nSyncService singleton
    """
    global _sync_service
    if _sync_service is None:
        _sync_service = N8nSyncService()
    return _sync_service


# Convenience functions

def sync_funnel(db: Session, funnel_id: str, auto_activate: bool = True) -> Optional[str]:
    """
    Sync a funnel to n8n with validation and optional auto-activation

    Args:
        db: Database session
        funnel_id: Funnel ID to sync
        auto_activate: If True and funnel is ACTIVE, activate workflow after sync

    Returns:
        n8n workflow ID if successful, None otherwise
    """
    return get_sync_service().sync_funnel(db, funnel_id, auto_activate=auto_activate)


def delete_workflow(db: Session, funnel_id: str) -> bool:
    """Delete n8n workflow for a funnel"""
    return get_sync_service().delete_workflow(db, funnel_id)


def activate_workflow(db: Session, funnel_id: str) -> bool:
    """Activate n8n workflow for a funnel"""
    return get_sync_service().activate_workflow(db, funnel_id)


def deactivate_workflow(db: Session, funnel_id: str) -> bool:
    """Deactivate n8n workflow for a funnel"""
    return get_sync_service().deactivate_workflow(db, funnel_id)
