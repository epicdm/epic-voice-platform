"""
Funnel Engine Flask Routes

API endpoints for funnel management.
Multi-tenant with userId enforcement.
"""

from flask import Blueprint, request, jsonify, session
from flask_login import login_required
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any
import uuid
import logging
import sys
import os

# Add project root to path for database imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from database import SessionLocal

from .models import (
    Funnel,
    FunnelNode,
    FunnelEdge,
    FunnelExecution,
    FunnelExecutionEvent,
    FunnelStageQueue,
    FunnelStatus,
    NodeType,
    ExecutionStatus,
)
from .enqueue import (
    enqueue_for_execution,
    get_queue_stats,
    get_execution_queue_entries,
)

# n8n integration
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from n8n_integration.sync import sync_funnel, activate_workflow, deactivate_workflow

logger = logging.getLogger(__name__)

# Create Flask blueprint
funnel_bp = Blueprint("funnels", __name__, url_prefix="/api/user/funnels")


def get_db() -> Session:
    """Get database session (creates new session per request)"""
    return SessionLocal()


def get_current_user_id() -> str:
    """Get current user ID from Flask session or X-User-Email header"""
    # LOCALHOST BYPASS: Return test UUID for local development
    if request.host.startswith('localhost') or request.host.startswith('127.0.0.1'):
        return "00000000-0000-0000-0000-000000000001"

    # First try X-User-Email header (for Next.js proxy requests)
    user_email = request.headers.get('X-User-Email')
    if user_email:
        db = get_db()
        try:
            from database import User
            from flask import abort
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                return str(user.id)
            # Return 403 Forbidden instead of 500 Internal Server Error
            abort(403, description=f"Unauthorized access")
        finally:
            db.close()

    # Fall back to Flask session
    user_id = session.get('user_id')
    if not user_id:
        from flask import abort
        # Return 401 Unauthorized instead of raising ValueError
        abort(401, description="Authentication required")
    return user_id


def auth_required(f):
    """Custom auth decorator that supports both Flask session and X-User-Email header"""
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # LOCALHOST BYPASS: Skip auth for local development
        if request.host.startswith('localhost') or request.host.startswith('127.0.0.1'):
            return f(*args, **kwargs)

        # Check X-User-Email header first
        user_email = request.headers.get('X-User-Email')
        if user_email:
            # Valid header auth, proceed
            return f(*args, **kwargs)

        # Fall back to Flask session (login_required behavior)
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        return f(*args, **kwargs)

    return decorated_function


# ============================================================================
# FUNNEL CRUD ENDPOINTS
# ============================================================================


@funnel_bp.route("", methods=["POST"])
@auth_required
def create_funnel():
    """
    Create a new funnel

    POST /api/funnels
    Body: { name, description?, status? }
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        data = request.json
        name = data.get("name")

        if not name:
            return jsonify({"error": "name is required"}), 400

        # Create funnel
        funnel = Funnel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name,
            description=data.get("description"),
            status=FunnelStatus(data.get("status", "draft")),
            graph={},
            settings=data.get("settings", {}),
        )

        db.add(funnel)
        db.commit()
        db.refresh(funnel)

        logger.info(f"Created funnel {funnel.id} for user {user_id}")

        return jsonify({
            "id": funnel.id,
            "name": funnel.name,
            "description": funnel.description,
            "status": funnel.status.value,
            "created_at": funnel.created_at.isoformat(),
        }), 201
    finally:
        db.close()


@funnel_bp.route("", methods=["GET"])
@auth_required
def list_funnels():
    """
    List funnels for current user

    GET /api/funnels?status=active&limit=20&offset=0
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Query parameters
        status = request.args.get("status")
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))

        # Build query with multi-tenant filter
        query = db.query(Funnel).filter(Funnel.user_id == user_id)

        if status:
            query = query.filter(Funnel.status == FunnelStatus(status))

        # Order by created date
        query = query.order_by(Funnel.created_at.desc())

        # Pagination
        total = query.count()
        funnels = query.limit(limit).offset(offset).all()

        return jsonify({
            "funnels": [
                {
                    "id": f.id,
                    "name": f.name,
                    "description": f.description,
                    "status": f.status.value,
                    "created_at": f.created_at.isoformat(),
                    "updated_at": f.updated_at.isoformat(),
                }
                for f in funnels
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        })
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>", methods=["GET"])
@auth_required
def get_funnel(funnel_id: str):
    """
    Get funnel by ID

    GET /api/funnels/{id}
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        funnel = db.query(Funnel).filter(
            Funnel.id == funnel_id,
            Funnel.user_id == user_id,
        ).first()

        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        # Get nodes and edges
        nodes = db.query(FunnelNode).filter(FunnelNode.funnel_id == funnel_id).all()
        edges = db.query(FunnelEdge).filter(FunnelEdge.funnel_id == funnel_id).all()

        return jsonify({
            "id": funnel.id,
            "name": funnel.name,
            "description": funnel.description,
            "status": funnel.status.value,
            "graph": funnel.graph,
            "settings": funnel.settings,
            "nodes": [
                {
                    "id": n.id,
                    "node_type": n.node_type.value,
                    "label": n.label,
                    "config": n.config,
                    "position": {"x": n.position_x, "y": n.position_y},
                }
                for n in nodes
            ],
            "edges": [
                {
                    "id": e.id,
                    "funnel_id": e.funnel_id,
                    "source_node_id": e.source_node_id,
                    "target_node_id": e.target_node_id,
                    "condition": e.condition,
                    "label": e.label,
                    "created_at": e.created_at.isoformat(),
                }
                for e in edges
            ],
            "created_at": funnel.created_at.isoformat(),
            "updated_at": funnel.updated_at.isoformat(),
        })
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>", methods=["PUT"])
@auth_required
def update_funnel(funnel_id: str):
    """
    Update funnel

    PUT /api/funnels/{id}
    Body: { name?, description?, status?, settings? }
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        funnel = db.query(Funnel).filter(
            Funnel.id == funnel_id,
            Funnel.user_id == user_id,
        ).first()

        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        data = request.json

        # Track if status changed
        old_status = funnel.status if funnel else None
        status_changed = False

        # Update fields
        if "name" in data:
            funnel.name = data["name"]
        if "description" in data:
            funnel.description = data["description"]
        if "status" in data:
            new_status = FunnelStatus(data["status"])
            if funnel.status != new_status:
                status_changed = True
            funnel.status = new_status
        if "settings" in data:
            funnel.settings = data["settings"]

        funnel.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Updated funnel {funnel_id}")

        # Handle status changes
        if status_changed:
            try:
                if funnel.status == FunnelStatus.ACTIVE:
                    # Sync first (ensure latest version), then activate
                    sync_funnel(db, funnel_id)
                    activate_workflow(db, funnel_id)
                    logger.info(f"Activated n8n workflow for funnel {funnel_id}")
                elif funnel.status in [FunnelStatus.PAUSED, FunnelStatus.ARCHIVED]:
                    # Deactivate workflow
                    deactivate_workflow(db, funnel_id)
                    logger.info(f"Deactivated n8n workflow for funnel {funnel_id}")
            except Exception as e:
                logger.warning(f"n8n status sync failed (non-fatal): {e}")
        elif "name" in data or "description" in data:
            # Sync workflow if name/description changed (but not status)
            try:
                sync_funnel(db, funnel_id)
            except Exception as e:
                logger.warning(f"n8n sync failed (non-fatal): {e}")

        return jsonify({"message": "Funnel updated successfully"})
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>", methods=["DELETE"])
@auth_required
def delete_funnel(funnel_id: str):
    """
    Delete funnel

    DELETE /api/funnels/{id}
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        funnel = db.query(Funnel).filter(
            Funnel.id == funnel_id,
            Funnel.user_id == user_id,
        ).first()

        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        # Delete n8n workflow first (while we still have the ID)
        try:
            from n8n_integration.sync import delete_workflow
            delete_workflow(db, funnel_id)
            logger.info(f"Deleted n8n workflow for funnel {funnel_id}")
        except Exception as e:
            logger.warning(f"n8n workflow deletion failed (non-fatal): {e}")

        db.delete(funnel)
        db.commit()

        logger.info(f"Deleted funnel {funnel_id}")

        return jsonify({"message": "Funnel deleted successfully"})
    finally:
        db.close()


# ============================================================================
# FUNNEL GRAPH ENDPOINTS
# ============================================================================


@funnel_bp.route("/<funnel_id>/graph", methods=["PUT"])
@auth_required
def update_funnel_graph(funnel_id: str):
    """
    Update funnel graph (nodes + edges)

    PUT /api/funnels/{id}/graph
    Body: { nodes: [...], edges: [...] }
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        funnel = db.query(Funnel).filter(
            Funnel.id == funnel_id,
            Funnel.user_id == user_id,
        ).first()

        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        data = request.json
        nodes_data = data.get("nodes", [])
        edges_data = data.get("edges", [])

        # Delete existing nodes and edges (cascade will handle)
        db.query(FunnelNode).filter(FunnelNode.funnel_id == funnel_id).delete()
        db.query(FunnelEdge).filter(FunnelEdge.funnel_id == funnel_id).delete()

        # Create new nodes
        for node_data in nodes_data:
            node = FunnelNode(
                id=node_data.get("id") or str(uuid.uuid4()),
                funnel_id=funnel_id,
                user_id=user_id,
                node_type=NodeType(node_data["type"]),
                label=node_data["label"],
                config=node_data.get("config", {}),
                position_x=node_data.get("position", {}).get("x"),
                position_y=node_data.get("position", {}).get("y"),
            )
            db.add(node)

        # Create new edges
        for edge_data in edges_data:
            edge = FunnelEdge(
                id=edge_data.get("id") or str(uuid.uuid4()),
                funnel_id=funnel_id,
                user_id=user_id,
                source_node_id=edge_data["source"],
                target_node_id=edge_data["target"],
                condition=edge_data.get("condition"),
                label=edge_data.get("label"),
            )
            db.add(edge)

        # Update funnel graph JSON
        funnel.graph = data
        funnel.updated_at = datetime.utcnow()

        db.commit()

        logger.info(f"Updated graph for funnel {funnel_id}: {len(nodes_data)} nodes, {len(edges_data)} edges")

        return jsonify({"message": "Funnel graph updated successfully"})
    finally:
        db.close()


# ============================================================================
# FUNNEL EXECUTION ENDPOINTS
# ============================================================================


@funnel_bp.route("/<funnel_id>/start", methods=["POST"])
@auth_required
def start_funnel_execution(funnel_id: str):
    """
    Start a new funnel execution

    POST /api/funnels/{id}/start
    Body: { contact_data: { phone, email, name, ... }, context?: {...} }
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        funnel = db.query(Funnel).filter(
            Funnel.id == funnel_id,
            Funnel.user_id == user_id,
        ).first()

        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        # Check funnel is active
        if funnel.status != FunnelStatus.ACTIVE:
            return jsonify({"error": "Funnel is not active"}), 400

        data = request.json
        contact_data = data.get("contact_data")

        if not contact_data:
            return jsonify({"error": "contact_data is required"}), 400

        # Create execution
        execution = FunnelExecution(
            id=str(uuid.uuid4()),
            funnel_id=funnel_id,
            user_id=user_id,
            contact_data=contact_data,
            context=data.get("context", {}),
            status=ExecutionStatus.ACTIVE,
        )

        db.add(execution)
        db.commit()
        db.refresh(execution)

        # Trigger n8n workflow via webhook
        if funnel.n8n_webhook_url:
            try:
                from backend.n8n_integration.sync import get_sync_service
                n8n_service = get_sync_service()

                # Prepare data for n8n webhook
                webhook_data = {
                    "execution_id": execution.id,
                    "funnel_id": funnel_id,
                    "user_id": user_id,
                    **contact_data,  # Include all contact fields (phone_number, email, etc.)
                    "context": data.get("context", {})
                }

                # Trigger workflow
                n8n_service.client.trigger_workflow(funnel.n8n_webhook_url, webhook_data)
                logger.info(f"✅ Triggered n8n workflow for execution {execution.id}")
                triggered = True

            except Exception as e:
                logger.error(f"❌ Failed to trigger n8n workflow: {e}")
                # Fall back to queue if webhook fails
                queue_entry = enqueue_for_execution(db, execution.id)
                triggered = queue_entry is not None
                logger.warning(f"⚠️  Fell back to queue execution")
        else:
            # No webhook URL - use queue fallback
            logger.warning(f"⚠️  No n8n webhook URL for funnel {funnel_id}, using queue")
            queue_entry = enqueue_for_execution(db, execution.id)
            triggered = queue_entry is not None

        logger.info(f"Started funnel execution {execution.id} for funnel {funnel_id}")

        return jsonify({
            "execution_id": execution.id,
            "funnel_id": funnel_id,
            "status": execution.status.value,
            "started_at": execution.started_at.isoformat(),
            "triggered": triggered,
        }), 201
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>/executions/complete", methods=["POST"])
def complete_funnel_execution(funnel_id: str):
    """
    Mark a funnel execution as complete (called by n8n workflow)

    POST /api/funnels/{id}/executions/complete
    Body: { execution_id: string, status?: string, completed_at?: string }
    """
    db = get_db()
    try:
        data = request.json
        execution_id = data.get("execution_id")

        if not execution_id:
            return jsonify({"error": "execution_id is required"}), 400

        # Find execution
        execution = db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id,
            FunnelExecution.funnel_id == funnel_id,
        ).first()

        if not execution:
            return jsonify({"error": "Execution not found"}), 404

        # Update status
        execution.status = ExecutionStatus.COMPLETED
        execution.completed_at = datetime.utcnow()

        db.commit()

        logger.info(f"✅ Funnel execution {execution_id} marked as complete")

        return jsonify({
            "execution_id": execution_id,
            "status": "completed",
            "completed_at": execution.completed_at.isoformat(),
        }), 200

    except Exception as e:
        logger.error(f"❌ Error completing execution: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>/executions", methods=["GET"])
@auth_required
def list_funnel_executions(funnel_id: str):
    """
    List executions for a funnel

    GET /api/funnels/{id}/executions?status=active&limit=20&offset=0
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        funnel = db.query(Funnel).filter(
            Funnel.id == funnel_id,
            Funnel.user_id == user_id,
        ).first()

        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        # Query parameters
        status = request.args.get("status")
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))

        # Build query
        query = db.query(FunnelExecution).filter(
            FunnelExecution.funnel_id == funnel_id,
            FunnelExecution.user_id == user_id,
        )

        if status:
            query = query.filter(FunnelExecution.status == ExecutionStatus(status))

        # Order by started date
        query = query.order_by(FunnelExecution.started_at.desc())

        # Pagination
        total = query.count()
        executions = query.limit(limit).offset(offset).all()

        return jsonify({
            "executions": [
                {
                    "id": ex.id,
                    "status": ex.status.value,
                    "current_node_id": ex.current_node_id,
                    "last_outcome": ex.last_outcome,
                    "started_at": ex.started_at.isoformat(),
                    "completed_at": ex.completed_at.isoformat() if ex.completed_at else None,
                }
                for ex in executions
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        })
    finally:
        db.close()


@funnel_bp.route("/executions/<execution_id>", methods=["GET"])
@auth_required
def get_execution(execution_id: str):
    """
    Get execution details

    GET /api/funnels/executions/{execution_id}
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        execution = db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id,
            FunnelExecution.user_id == user_id,
        ).first()

        if not execution:
            return jsonify({"error": "Execution not found"}), 404

        # Get events
        events = db.query(FunnelExecutionEvent).filter(
            FunnelExecutionEvent.execution_id == execution_id
        ).order_by(FunnelExecutionEvent.created_at).all()

        return jsonify({
            "id": execution.id,
            "funnel_id": execution.funnel_id,
            "status": execution.status.value,
            "current_node_id": execution.current_node_id,
            "contact_data": execution.contact_data,
            "context": execution.context,
            "last_outcome": execution.last_outcome,
            "started_at": execution.started_at.isoformat(),
            "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
            "events": [
                {
                    "id": ev.id,
                    "type": ev.event_type,
                    "node_id": ev.node_id,
                    "outcome": ev.outcome,
                    "metadata": ev.event_metadata,
                    "error_message": ev.error_message,
                    "created_at": ev.created_at.isoformat(),
                }
                for ev in events
            ],
        })
    finally:
        db.close()


@funnel_bp.route("/executions/<execution_id>/cancel", methods=["POST"])
@auth_required
def cancel_execution(execution_id: str):
    """
    Cancel an active execution

    POST /api/funnels/executions/{execution_id}/cancel
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        execution = db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id,
            FunnelExecution.user_id == user_id,
        ).first()

        if not execution:
            return jsonify({"error": "Execution not found"}), 404

        if execution.status != ExecutionStatus.ACTIVE:
            return jsonify({"error": "Execution is not active"}), 400

        # Cancel execution
        execution.status = ExecutionStatus.CANCELLED
        execution.completed_at = datetime.utcnow()
        execution.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Cancelled execution {execution_id}")

        return jsonify({"message": "Execution cancelled successfully"})
    finally:
        db.close()


# ============================================================================
# QUEUE STATS ENDPOINT
# ============================================================================


@funnel_bp.route("/queue/stats", methods=["GET"])
@auth_required
def get_funnel_queue_stats():
    """
    Get queue statistics

    GET /api/funnels/queue/stats
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        stats = get_queue_stats(db, user_id)

        return jsonify(stats)
    finally:
        db.close()


# ============================================================================
# ERROR HANDLERS
# ============================================================================


@funnel_bp.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request", "message": str(e)}), 400


@funnel_bp.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found", "message": str(e)}), 404


@funnel_bp.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {e}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500


# ============================================================================
# LANDING PAGE GENERATION
# ============================================================================


@funnel_bp.route("/<funnel_id>/generate-landing-page", methods=["POST"])
@auth_required
def generate_landing_page(funnel_id: str):
    """
    Generate AI landing page content for a funnel

    POST /api/funnels/{id}/generate-landing-page
    Body: {
        "purpose": "Real estate lead generation",
        "industry": "real_estate",  // optional
        "tone": "professional"       // optional: professional, friendly, urgent
    }
    """
    db = get_db()
    try:
        user_id = get_current_user_id()

        # Multi-tenant check
        funnel = db.query(Funnel).filter(
            Funnel.id == funnel_id,
            Funnel.user_id == user_id,
        ).first()

        if not funnel:
            return jsonify({"error": "Funnel not found"}), 404

        data = request.json or {}
        purpose = data.get("purpose", "")
        industry = data.get("industry")
        tone = data.get("tone", "professional")

        # Import generator
        from backend.landing_page_generator import generate_landing_page_content

        # Generate content
        content = generate_landing_page_content(
            funnel_name=funnel.name,
            funnel_description=funnel.description or "",
            purpose=purpose,
            industry=industry,
            tone=tone
        )

        logger.info(f"Generated landing page for funnel {funnel_id}")

        return jsonify({
            "success": True,
            "content": content
        })

    except Exception as e:
        logger.error(f"Error generating landing page: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ============================================================================
# NODE CRUD ENDPOINTS (Individual Operations)
# ============================================================================


@funnel_bp.route("/<funnel_id>/nodes", methods=["POST"])
@auth_required
def add_funnel_node(funnel_id: str):
    """
    Add a single node to a funnel
    
    POST /api/funnels/{id}/nodes
    Body: { node_type, label, config, position_x, position_y }
    Returns: { node_id }
    """
    db = get_db()
    user_id = get_current_user_id()
    
    # Multi-tenant check
    funnel = db.query(Funnel).filter(
        Funnel.id == funnel_id,
        Funnel.user_id == user_id,
    ).first()
    
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404
    
    data = request.json
    
    # Validate required fields
    if not data.get("node_type") or not data.get("label"):
        return jsonify({"error": "node_type and label are required"}), 400
    
    try:
        # Create node
        node_id = str(uuid.uuid4())
        node = FunnelNode(
            id=node_id,
            funnel_id=funnel_id,
            user_id=user_id,
            node_type=NodeType(data["node_type"]),
            label=data["label"],
            config=data.get("config", {}),
            position_x=data.get("position_x"),
            position_y=data.get("position_y"),
        )
        db.add(node)
        funnel.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Added node {node_id} to funnel {funnel_id}")

        # Auto-sync to n8n
        try:
            sync_funnel(db, funnel_id)
        except Exception as e:
            logger.warning(f"n8n sync failed (non-fatal): {e}")

        return jsonify({"node_id": node_id}), 201
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding node: {e}")
        return jsonify({"error": "Failed to add node"}), 500
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>/nodes/<node_id>", methods=["PUT"])
@auth_required
def update_funnel_node(funnel_id: str, node_id: str):
    """
    Update a single node
    
    PUT /api/funnels/{funnel_id}/nodes/{node_id}
    Body: { label?, config?, position_x?, position_y? }
    """
    db = get_db()
    user_id = get_current_user_id()
    
    # Multi-tenant check - verify both funnel and node belong to user
    node = db.query(FunnelNode).filter(
        FunnelNode.id == node_id,
        FunnelNode.funnel_id == funnel_id,
        FunnelNode.user_id == user_id,
    ).first()
    
    if not node:
        return jsonify({"error": "Node not found"}), 404
    
    data = request.json
    
    try:
        # Update allowed fields
        if "label" in data:
            node.label = data["label"]
        if "config" in data:
            node.config = data["config"]
        if "position_x" in data:
            node.position_x = data["position_x"]
        if "position_y" in data:
            node.position_y = data["position_y"]
        
        node.updated_at = datetime.utcnow()
        
        # Update funnel timestamp
        funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
        if funnel:
            funnel.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Updated node {node_id} in funnel {funnel_id}")
        
        return jsonify({"message": "Node updated successfully"})
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating node: {e}")
        return jsonify({"error": "Failed to update node"}), 500
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>/nodes/<node_id>", methods=["DELETE"])
@auth_required
def delete_funnel_node(funnel_id: str, node_id: str):
    """
    Delete a single node
    
    DELETE /api/funnels/{funnel_id}/nodes/{node_id}
    """
    db = get_db()
    user_id = get_current_user_id()
    
    # Multi-tenant check
    node = db.query(FunnelNode).filter(
        FunnelNode.id == node_id,
        FunnelNode.funnel_id == funnel_id,
        FunnelNode.user_id == user_id,
    ).first()
    
    if not node:
        return jsonify({"error": "Node not found"}), 404
    
    try:
        # Delete node (cascade will delete related edges)
        db.delete(node)
        
        # Update funnel timestamp
        funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
        if funnel:
            funnel.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Deleted node {node_id} from funnel {funnel_id}")
        
        return jsonify({"message": "Node deleted successfully"})
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting node: {e}")
        return jsonify({"error": "Failed to delete node"}), 500
    finally:
        db.close()


# ============================================================================
# EDGE CRUD ENDPOINTS (Individual Operations)
# ============================================================================


@funnel_bp.route("/<funnel_id>/edges", methods=["POST"])
@auth_required
def add_funnel_edge(funnel_id: str):
    """
    Add a single edge to a funnel
    
    POST /api/funnels/{id}/edges
    Body: { source_node_id, target_node_id, condition?, label? }
    Returns: { edge_id }
    """
    db = get_db()
    user_id = get_current_user_id()
    
    # Multi-tenant check
    funnel = db.query(Funnel).filter(
        Funnel.id == funnel_id,
        Funnel.user_id == user_id,
    ).first()
    
    if not funnel:
        return jsonify({"error": "Funnel not found"}), 404
    
    data = request.json
    
    # Validate required fields
    if not data.get("source_node_id") or not data.get("target_node_id"):
        return jsonify({"error": "source_node_id and target_node_id are required"}), 400
    
    # Verify both nodes exist and belong to this funnel
    source_node = db.query(FunnelNode).filter(
        FunnelNode.id == data["source_node_id"],
        FunnelNode.funnel_id == funnel_id,
    ).first()
    
    target_node = db.query(FunnelNode).filter(
        FunnelNode.id == data["target_node_id"],
        FunnelNode.funnel_id == funnel_id,
    ).first()
    
    if not source_node or not target_node:
        return jsonify({"error": "Source or target node not found"}), 404
    
    try:
        # Create edge
        edge_id = str(uuid.uuid4())
        edge = FunnelEdge(
            id=edge_id,
            funnel_id=funnel_id,
            user_id=user_id,
            source_node_id=data["source_node_id"],
            target_node_id=data["target_node_id"],
            condition=data.get("condition"),
            label=data.get("label"),
        )
        db.add(edge)
        funnel.updated_at = datetime.utcnow()
        db.commit()

        logger.info(f"Added edge {edge_id} to funnel {funnel_id}")

        # Auto-sync to n8n
        try:
            sync_funnel(db, funnel_id)
        except Exception as e:
            logger.warning(f"n8n sync failed (non-fatal): {e}")

        return jsonify({"edge_id": edge_id}), 201
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding edge: {e}")
        return jsonify({"error": "Failed to add edge"}), 500
    finally:
        db.close()


@funnel_bp.route("/<funnel_id>/edges/<edge_id>", methods=["DELETE"])
@auth_required
def delete_funnel_edge(funnel_id: str, edge_id: str):
    """
    Delete a single edge
    
    DELETE /api/funnels/{funnel_id}/edges/{edge_id}
    """
    db = get_db()
    user_id = get_current_user_id()
    
    # Multi-tenant check
    edge = db.query(FunnelEdge).filter(
        FunnelEdge.id == edge_id,
        FunnelEdge.funnel_id == funnel_id,
        FunnelEdge.user_id == user_id,
    ).first()
    
    if not edge:
        return jsonify({"error": "Edge not found"}), 404
    
    try:
        # Delete edge
        db.delete(edge)
        
        # Update funnel timestamp
        funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
        if funnel:
            funnel.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Deleted edge {edge_id} from funnel {funnel_id}")
        
        return jsonify({"message": "Edge deleted successfully"})
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting edge: {e}")
        return jsonify({"error": "Failed to delete edge"}), 500
    finally:
        db.close()

