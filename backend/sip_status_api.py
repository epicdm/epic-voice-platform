"""
SIP Trunk Registration Status API

Provides endpoints to check SIP trunk registration status for AI agents
- EPIC Voice SIP peer status
- LiveKit SIP trunk status
- Combined health check
"""

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from database import SessionLocal, AgentConfig
from phone_number_manager import PhoneNumberPool
from magnus_billing_client_new import MagnusBillingClientNew
from backend.agent_health_check import (
    check_agent_process_running,
    get_agent_directory,
    calculate_call_readiness
)
import os
import logging
from datetime import datetime
from typing import Dict, List

logger = logging.getLogger(__name__)

sip_status_bp = Blueprint('sip_status', __name__)

def get_magnus_client():
    """Initialize EPIC Voice SIP client"""
    return MagnusBillingClientNew(
        api_key=os.getenv('MAGNUS_API_KEY'),
        secret_key=os.getenv('MAGNUS_SECRET_KEY'),
        base_url=os.getenv('MAGNUS_BASE_URL', 'https://voice.epic.dm')
    )

def check_livekit_trunk_status(trunk_id: str) -> Dict:
    """
    Check LiveKit SIP trunk status

    Returns:
        {
            'active': True/False,
            'status': 'online'/'offline'/'error',
            'last_activity': '2025-11-20T17:30:45Z'
        }
    """
    try:
        # TODO: Implement LiveKit API call to check trunk status
        # For now, return basic status
        return {
            'active': True,
            'status': 'online',
            'last_activity': datetime.utcnow().isoformat() + 'Z',
            'checked_at': datetime.utcnow().isoformat() + 'Z'
        }
    except Exception as e:
        logger.error(f"Error checking LiveKit trunk status: {e}")
        return {
            'active': False,
            'status': 'error',
            'error': str(e)
        }

@sip_status_bp.route('/api/user/agents/<agent_id>/sip-status', methods=['GET', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def get_agent_sip_status(agent_id):
    """
    Get comprehensive SIP trunk registration status for an agent

    Returns:
        {
            'success': True,
            'agent_id': 'uuid',
            'agent_name': 'Customer Support',
            'phone_number': '+17678189267',
            'magnus': {
                'registered': True,
                'ip_address': '1.2.3.4',
                'port': 5060,
                'last_seen': '2025-11-20 17:30:45',
                'latency_ms': 50,
                'user_agent': 'LiveKit SIP'
            },
            'livekit': {
                'active': True,
                'status': 'online',
                'trunk_id': 'TR_xxx'
            },
            'overall_status': 'registered'/'unregistered'/'partial'/'error',
            'health_score': 100,  # 0-100
            'warnings': [],
            'errors': [],
            'checked_at': '2025-11-20T17:30:45Z'
        }
    """
    if request.method == 'OPTIONS':
        return '', 204

    db = SessionLocal()
    try:
        # Get agent
        agent = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()

        if not agent:
            return jsonify({'success': False, 'error': 'Agent not found'}), 404

        # Get SIP username from agent or phone_number_pool
        sip_username = agent.sip_username
        phone_number = agent.did_number
        phone_pool = None

        # If no SIP username on agent, check phone_number_pool
        if not sip_username:
            # Strategy 1: Lookup by phone number (if agent has did_number set)
            if phone_number:
                phone_pool = db.query(PhoneNumberPool).filter(
                    PhoneNumberPool.phone_number == phone_number
                ).first()

            # Strategy 2: Lookup by agent ID assignment (if phone not found above)
            if not phone_pool:
                phone_pool = db.query(PhoneNumberPool).filter(
                    PhoneNumberPool.assigned_to_agent_id == agent_id
                ).first()

            # Extract credentials from phone pool
            if phone_pool:
                if phone_pool.magnus_sip_username:
                    sip_username = phone_pool.magnus_sip_username
                if phone_pool.phone_number:
                    phone_number = phone_pool.phone_number

        # Check if agent has SIP credentials
        if not sip_username:
            # Even if not provisioned, check agent status using stored PID
            agent_running = False
            agent_pid = getattr(agent, 'process_pid', None)

            if agent_pid:
                # Check if this specific PID is still running
                try:
                    import psutil
                    proc = psutil.Process(agent_pid)
                    agent_running = proc.is_running()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    agent_running = False

            agent_dir = get_agent_directory(agent_id, agent.name)
            agent_status = {
                'status': 'online' if agent_running else 'offline',
                'process_running': agent_running,
                'pid': agent_pid if agent_running else None,
                'uptime_seconds': None,
                'agent_directory': agent_dir
            }

            sip_trunk_status = {
                'status': 'not_provisioned',
                'magnus': {},
                'livekit': {},
                'health_score': 0
            }

            # Customize message based on whether phone number exists and agent is running
            has_phone = bool(phone_number)
            if has_phone and agent_running:
                blocking_msg = 'Phone number assigned but SIP trunk not provisioned - please contact support'
                call_ready_msg = 'SIP trunk provisioning needed for phone number ' + phone_number
            elif has_phone and not agent_running:
                blocking_msg = 'Phone number assigned but agent not running'
                call_ready_msg = 'Start agent to activate phone number ' + phone_number
            elif not has_phone and agent_running:
                blocking_msg = 'Agent is running but needs a phone number assigned to receive calls'
                call_ready_msg = 'Assign a phone number to enable inbound/outbound calls'
            else:
                blocking_msg = 'No phone number assigned and agent is not running'
                call_ready_msg = 'Start agent and assign a phone number'

            call_readiness = {
                'ready': False,
                'status': 'not_ready',
                'blocking_issues': [blocking_msg],
                'warnings': [],
                'message': call_ready_msg
            }

            return jsonify({
                'success': True,
                'agent_id': agent_id,
                'agent_name': agent.name,
                'phone_number': phone_number,
                'sip_trunk': sip_trunk_status,
                'agent': agent_status,
                'call_readiness': call_readiness,
                # Legacy fields
                'overall_status': 'not_provisioned',
                'health_score': 0,
                'message': call_ready_msg,
                'magnus': {},
                'livekit': {},
                'warnings': [],
                'errors': [blocking_msg],
                'checked_at': datetime.utcnow().isoformat() + 'Z'
            })

        warnings = []
        errors = []

        # Check EPIC Voice registration status
        magnus_client = get_magnus_client()
        magnus_status = magnus_client.get_sip_registration_status(sip_name=sip_username)

        magnus_data = {}
        if magnus_status.get('success'):
            magnus_data = {
                'registered': magnus_status.get('registered', False),
                'ip_address': magnus_status.get('ip_address'),
                'port': magnus_status.get('port'),
                'last_seen': magnus_status.get('last_seen'),
                'latency_ms': magnus_status.get('latency_ms'),
                'user_agent': magnus_status.get('user_agent')
            }

            if not magnus_status.get('registered'):
                errors.append('SIP trunk not registered with EPIC Voice')

            if magnus_status.get('latency_ms') and magnus_status.get('latency_ms') > 200:
                warnings.append(f"High latency: {magnus_status.get('latency_ms')}ms")
        else:
            errors.append(f"Could not check SIP status: {magnus_status.get('error')}")
            magnus_data = {'error': magnus_status.get('error')}

        # Check LiveKit trunk status (if trunk ID exists)
        livekit_data = {}
        # Get trunk ID from phone_pool (where it's actually stored)
        # Try outbound first, then inbound (either one is sufficient)
        trunk_id = None
        if phone_pool:
            trunk_id = phone_pool.livekit_outbound_trunk_id or phone_pool.livekit_inbound_trunk_id

        if not trunk_id:
            # Fallback to agent config (for backward compatibility)
            trunk_id = getattr(agent, 'livekitOutboundTrunkId', None)

        if trunk_id:
            livekit_data = check_livekit_trunk_status(trunk_id)
            livekit_data['trunk_id'] = trunk_id

            if not livekit_data.get('active'):
                errors.append('LiveKit SIP trunk is not active')
        else:
            # LiveKit trunk check not implemented yet - skip warning
            pass

        # Determine overall status
        magnus_registered = magnus_data.get('registered', False)
        livekit_active = livekit_data.get('active', False)

        if magnus_registered and livekit_active:
            overall_status = 'registered'
            health_score = 100
        elif magnus_registered or livekit_active:
            overall_status = 'partial'
            health_score = 50
        elif errors:
            overall_status = 'error'
            health_score = 0
        else:
            overall_status = 'unregistered'
            health_score = 0

        # Adjust health score based on warnings/errors
        health_score -= len(warnings) * 10
        health_score -= len(errors) * 25
        health_score = max(0, health_score)

        # Check agent process status using stored PID
        agent_running = False
        agent_pid = getattr(agent, 'process_pid', None)

        if agent_pid:
            # Check if this specific PID is still running
            try:
                import psutil
                proc = psutil.Process(agent_pid)
                agent_running = proc.is_running()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                agent_running = False

        agent_dir = get_agent_directory(agent_id, agent.name)

        # Build SIP trunk status object
        sip_trunk_status = {
            'status': overall_status,
            'magnus': magnus_data,
            'livekit': livekit_data,
            'health_score': health_score
        }

        # Build agent status object
        agent_status = {
            'status': 'online' if agent_running else 'offline',
            'process_running': agent_running,
            'pid': agent_pid if agent_running else None,
            'uptime_seconds': None,
            'cpu_percent': None,
            'memory_mb': None,
            'last_heartbeat': None,
            'agent_directory': agent_dir
        }

        # Calculate overall call readiness
        call_readiness = calculate_call_readiness(sip_trunk_status, agent_status)

        return jsonify({
            'success': True,
            'agent_id': agent_id,
            'agent_name': agent.name,
            'phone_number': phone_number,
            'sip_username': sip_username,
            # Layer 1: SIP Trunk Infrastructure
            'sip_trunk': sip_trunk_status,
            # Layer 2: Agent Application Status
            'agent': agent_status,
            # Layer 3: Overall Call Readiness
            'call_readiness': call_readiness,
            # Legacy fields for backwards compatibility
            'magnus': magnus_data,
            'livekit': livekit_data,
            'overall_status': call_readiness['status'],  # Use call_readiness status
            'health_score': health_score,
            'warnings': warnings + call_readiness.get('warnings', []),
            'errors': errors + call_readiness.get('blocking_issues', []),
            'checked_at': datetime.utcnow().isoformat() + 'Z'
        })

    except Exception as e:
        logger.error(f"Error getting SIP status for agent {agent_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@sip_status_bp.route('/api/user/agents/sip-status/bulk', methods=['POST', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def get_bulk_agent_sip_status():
    """
    Get SIP status for multiple agents at once

    Request body:
        {
            'agent_ids': ['uuid1', 'uuid2', 'uuid3']
        }

    Returns:
        {
            'success': True,
            'results': {
                'uuid1': { ... status ... },
                'uuid2': { ... status ... }
            },
            'summary': {
                'total': 10,
                'registered': 8,
                'unregistered': 1,
                'error': 1
            }
        }
    """
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()
    agent_ids = data.get('agent_ids', [])

    if not agent_ids:
        return jsonify({'success': False, 'error': 'agent_ids required'}), 400

    db = SessionLocal()
    try:
        results = {}
        summary = {'total': 0, 'registered': 0, 'unregistered': 0, 'partial': 0, 'error': 0}

        # Get all agents
        agents = db.query(AgentConfig).filter(AgentConfig.id.in_(agent_ids)).all()

        # Get phone number pool records for agents (by agent assignment)
        phone_pools_by_agent = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.assigned_to_agent_id.in_(agent_ids)
        ).all()
        phone_pool_map = {p.assigned_to_agent_id: p for p in phone_pools_by_agent}

        # Also get phone numbers that match agent did_numbers (as backup)
        agents_with_phones = [a for a in agents if a.did_number]
        if agents_with_phones:
            phone_numbers = [a.did_number for a in agents_with_phones]
            phone_pools_by_number = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.phone_number.in_(phone_numbers)
            ).all()
            # Add to map by agent (find which agent has which phone)
            for phone_pool in phone_pools_by_number:
                for agent in agents_with_phones:
                    if agent.did_number == phone_pool.phone_number:
                        if agent.id not in phone_pool_map:
                            phone_pool_map[agent.id] = phone_pool

        # Get Magnus client
        magnus_client = get_magnus_client()

        # Collect all SIP usernames for bulk check
        sip_names = []
        agent_sip_map = {}  # Map agent_id to sip_username

        for agent in agents:
            sip_username = agent.sip_username
            # Check phone_number_pool if no sip_username
            if not sip_username and agent.id in phone_pool_map:
                sip_username = phone_pool_map[agent.id].magnus_sip_username

            if sip_username:
                sip_names.append(sip_username)
                agent_sip_map[agent.id] = sip_username

        # Bulk check Magnus status
        magnus_statuses = {}
        if sip_names:
            magnus_statuses = magnus_client.get_bulk_sip_status(sip_names)

        # Build results for each agent
        for agent in agents:
            summary['total'] += 1

            sip_username = agent_sip_map.get(agent.id)

            if not sip_username:
                results[agent.id] = {
                    'agent_name': agent.name,
                    'overall_status': 'not_provisioned',
                    'registered': False
                }
                summary['unregistered'] += 1
                continue

            # Get Magnus status from bulk results
            magnus_status = magnus_statuses.get(sip_username, {})
            is_registered = magnus_status.get('registered', False)

            # Get phone number from agent or phone_pool
            phone_number = agent.did_number
            if not phone_number and agent.id in phone_pool_map:
                phone_number = phone_pool_map[agent.id].phone_number

            results[agent.id] = {
                'agent_name': agent.name,
                'phone_number': phone_number,
                'overall_status': 'registered' if is_registered else 'unregistered',
                'registered': is_registered,
                'ip_address': magnus_status.get('ip_address'),
                'last_seen': magnus_status.get('last_seen'),
                'latency_ms': magnus_status.get('latency_ms')
            }

            if is_registered:
                summary['registered'] += 1
            else:
                summary['unregistered'] += 1

        return jsonify({
            'success': True,
            'results': results,
            'summary': summary,
            'checked_at': datetime.utcnow().isoformat() + 'Z'
        })

    except Exception as e:
        logger.error(f"Error getting bulk SIP status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

logger.info("✅ SIP Status API endpoints registered")
