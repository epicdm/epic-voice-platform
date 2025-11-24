"""
FreeSWITCH Provisioning API Routes
Provides REST API endpoints for DID provisioning
"""

from flask import Blueprint, request, jsonify
from freeswitch_provisioning import FreeSWITCHProvisioner, provision_agent_did, deprovision_agent_did
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
freeswitch_bp = Blueprint('freeswitch', __name__, url_prefix='/api/freeswitch')


# Initialize provisioner (singleton)
provisioner = FreeSWITCHProvisioner(
    ssh_host="24.199.103.153",
    ssh_user="root",
    ssh_password="TAIOiEajqAl7H9vF4uXN",  # TODO: Move to environment variable
    livekit_sip_domain="3m4yki5jezn.sip.livekit.cloud"
)


@freeswitch_bp.route('/provision', methods=['POST'])
def provision_did():
    """
    Provision DID routing for AI agent

    Request Body:
    {
        "phone_number": "+17678189426",
        "agent_config_id": 1,
        "agent_name": "Customer Support AI"
    }

    Response:
    {
        "success": true,
        "did": "+17678189426",
        "agent_config_id": 1,
        "route_verified": true,
        "message": "DID +17678189426 routed to LiveKit"
    }
    """
    try:
        data = request.get_json()

        phone_number = data.get('phone_number')
        agent_config_id = data.get('agent_config_id')
        agent_name = data.get('agent_name', 'Unknown Agent')

        if not phone_number:
            return jsonify({
                'success': False,
                'error': 'phone_number is required'
            }), 400

        # Provision DID
        result = provision_agent_did(
            phone_number=phone_number,
            agent_config_id=agent_config_id,
            agent_name=agent_name
        )

        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Provision DID error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@freeswitch_bp.route('/deprovision', methods=['POST'])
def deprovision_did():
    """
    Remove DID routing

    Request Body:
    {
        "phone_number": "+17678189426"
    }

    Response:
    {
        "success": true,
        "did": "+17678189426",
        "message": "DID +17678189426 routing removed"
    }
    """
    try:
        data = request.get_json()
        phone_number = data.get('phone_number')

        if not phone_number:
            return jsonify({
                'success': False,
                'error': 'phone_number is required'
            }), 400

        result = deprovision_agent_did(phone_number)

        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Deprovision DID error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@freeswitch_bp.route('/dids', methods=['GET'])
def list_dids():
    """
    List all provisioned DIDs

    Response:
    {
        "success": true,
        "dids": ["+17678189426", "+17678189267"],
        "count": 2
    }
    """
    try:
        dids = provisioner.list_provisioned_dids()

        return jsonify({
            'success': True,
            'dids': dids,
            'count': len(dids)
        })

    except Exception as e:
        logger.error(f"List DIDs error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@freeswitch_bp.route('/verify/<phone_number>', methods=['GET'])
def verify_did(phone_number):
    """
    Verify DID routing is configured

    Path: /api/freeswitch/verify/+17678189426

    Response:
    {
        "success": true,
        "did": "+17678189426",
        "routing_configured": true
    }
    """
    try:
        # URL decode phone number (+ becomes space)
        phone_number = phone_number.replace(' ', '+')

        verified = provisioner.verify_did_routing(phone_number)

        return jsonify({
            'success': True,
            'did': phone_number,
            'routing_configured': verified
        })

    except Exception as e:
        logger.error(f"Verify DID error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@freeswitch_bp.route('/active-calls', methods=['GET'])
def active_calls():
    """
    Get currently active calls

    Response:
    {
        "success": true,
        "calls": [
            {
                "uuid": "...",
                "caller_id_number": "17678189426",
                "destination_number": "2000",
                "duration": 120
            }
        ],
        "count": 1
    }
    """
    try:
        calls = provisioner.get_active_calls()

        return jsonify({
            'success': True,
            'calls': calls,
            'count': len(calls)
        })

    except Exception as e:
        logger.error(f"Get active calls error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@freeswitch_bp.route('/reload', methods=['POST'])
def reload_config():
    """
    Reload FreeSWITCH configuration

    Response:
    {
        "success": true,
        "message": "FreeSWITCH configuration reloaded"
    }
    """
    try:
        success = provisioner.reload_configuration()

        if success:
            return jsonify({
                'success': True,
                'message': 'FreeSWITCH configuration reloaded'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Reload failed'
            }), 500

    except Exception as e:
        logger.error(f"Reload config error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@freeswitch_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint

    Response:
    {
        "success": true,
        "status": "healthy",
        "provisioner": "connected"
    }
    """
    try:
        # Test SSH connection
        _, stdout, _ = provisioner._ssh_execute('echo "test"')

        if 'test' in stdout:
            return jsonify({
                'success': True,
                'status': 'healthy',
                'provisioner': 'connected'
            })
        else:
            return jsonify({
                'success': False,
                'status': 'unhealthy',
                'provisioner': 'disconnected'
            }), 503

    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 503
