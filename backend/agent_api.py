"""
Agent Management API
Endpoints for creating and managing LiveKit agents from frontend
"""
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import logging
from agent_creator import AgentCreator
from database import SessionLocal, AgentConfig as AgentConfigModel
from backend.agent_health_check import start_agent_process, stop_agent_process, get_agent_directory

logger = logging.getLogger(__name__)

agent_api = Blueprint('agent_api', __name__, url_prefix='/api/user')

# Initialize agent creator
agent_creator = AgentCreator()


@agent_api.route('/agents', methods=['POST'])
@cross_origin()
def create_agent():
    """
    Create a new LiveKit agent from frontend configuration
    
    POST /api/user/agents
    Body: {
        "name": "Customer Support",
        "description": "Helps customers",
        "instructions": "You are helpful...",
        "personality": "friendly",
        "llm": {"model": "gpt-4o-mini", "temperature": 0.7},
        "stt": {"model": "deepgram-nova-3"},
        "tts": {"voice": "openai-ash"},
        "features": {...}
    }
    
    Returns: {
        "id": "agent_123",
        "agent_id": "customer_support",
        "name": "Customer Support",
        "status": "created",
        "path": "/opt/livekit1/agents/customer_support"
    }
    """
    try:
        # Get configuration from request
        config = request.json
        
        # Validate required fields
        required_fields = ['name', 'instructions']
        missing_fields = [f for f in required_fields if f not in config]
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Get user ID from session/auth
        # TODO: Get actual user ID from authentication
        user_id = request.headers.get('X-User-Id', 'default_user')
        
        # Create the agent files
        result = agent_creator.create_agent(config)
        
        # Save to database
        db = SessionLocal()
        try:
            agent_record = AgentConfigModel(
                user_id=user_id,
                agent_id=result['agent_id'],
                name=config['name'],
                description=config.get('description', ''),
                config_json=config,
                file_path=result['path'],
                status='created'
            )
            db.add(agent_record)
            db.commit()
            db.refresh(agent_record)
            
            response = {
                'id': agent_record.id,
                'agent_id': result['agent_id'],
                'name': config['name'],
                'description': config.get('description', ''),
                'status': 'created',
                'path': result['path'],
                'files_created': result['files_created'],
                'created_at': agent_record.created_at.isoformat()
            }
            
            logger.info(f"Agent created: {result['agent_id']} for user {user_id}")
            return jsonify(response), 201
            
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Error creating agent: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to create agent',
            'details': str(e)
        }), 500


@agent_api.route('/agents', methods=['GET'])
@cross_origin()
def list_agents():
    """
    List all agents for the current user
    
    GET /api/user/agents
    
    Returns: {
        "agents": [
            {"id": "1", "agent_id": "...", "name": "...", ...},
            ...
        ],
        "count": 5
    }
    """
    try:
        # TODO: Get actual user ID from authentication
        user_id = request.headers.get('X-User-Id', 'default_user')
        
        db = SessionLocal()
        try:
            agents = db.query(AgentConfigModel).filter(
                AgentConfigModel.user_id == user_id
            ).all()
            
            return jsonify({
                'agents': [
                    {
                        'id': agent.id,
                        'agent_id': agent.agent_id,
                        'name': agent.name,
                        'description': agent.description,
                        'status': agent.status,
                        'is_active': agent.isActive if hasattr(agent, 'isActive') else True,
                        'phone_number': agent.phone_number if hasattr(agent, 'phone_number') else None,
                        'voice': agent.voice if hasattr(agent, 'voice') else None,
                        'created_at': agent.created_at.isoformat(),
                        'updated_at': agent.updated_at.isoformat() if agent.updated_at else None,
                    }
                    for agent in agents
                ],
                'count': len(agents)
            })
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        return jsonify({'error': 'Failed to list agents'}), 500


@agent_api.route('/agents/<agent_id>', methods=['GET'])
@cross_origin()
def get_agent(agent_id: str):
    """
    Get a specific agent's configuration
    
    GET /api/user/agents/{agent_id}
    
    Returns: {
        "id": "1",
        "agent_id": "customer_support",
        "name": "Customer Support",
        "config": {...},
        ...
    }
    """
    try:
        user_id = request.headers.get('X-User-Id', 'default_user')
        
        db = SessionLocal()
        try:
            agent = db.query(AgentConfigModel).filter(
                AgentConfigModel.agent_id == agent_id,
                AgentConfigModel.user_id == user_id
            ).first()
            
            if not agent:
                return jsonify({'error': 'Agent not found'}), 404
            
            return jsonify({
                'id': agent.id,
                'agent_id': agent.agent_id,
                'name': agent.name,
                'description': agent.description,
                'config': agent.config_json,
                'status': agent.status,
                'file_path': agent.file_path,
                'created_at': agent.created_at.isoformat(),
                'updated_at': agent.updated_at.isoformat() if agent.updated_at else None,
            })
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Error getting agent: {e}")
        return jsonify({'error': 'Failed to get agent'}), 500


@agent_api.route('/agents/<agent_id>', methods=['DELETE'])
@cross_origin()
def delete_agent(agent_id: str):
    """
    Delete an agent
    
    DELETE /api/user/agents/{agent_id}
    
    Returns: {
        "success": true,
        "message": "Agent deleted"
    }
    """
    try:
        user_id = request.headers.get('X-User-Id', 'default_user')
        
        db = SessionLocal()
        try:
            agent = db.query(AgentConfigModel).filter(
                AgentConfigModel.agent_id == agent_id,
                AgentConfigModel.user_id == user_id
            ).first()
            
            if not agent:
                return jsonify({'error': 'Agent not found'}), 404
            
            # TODO: Also delete the agent files
            # import shutil
            # shutil.rmtree(agent.file_path, ignore_errors=True)
            
            db.delete(agent)
            db.commit()
            
            logger.info(f"Agent deleted: {agent_id} by user {user_id}")
            
            return jsonify({
                'success': True,
                'message': f'Agent {agent_id} deleted'
            })
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        return jsonify({'error': 'Failed to delete agent'}), 500


@agent_api.route('/agents/<agent_id>/deploy', methods=['POST'])
@cross_origin()
def deploy_agent(agent_id: str):
    """
    Deploy/start an agent

    POST /api/user/agents/{agent_id}/deploy

    Returns: {
        "success": true,
        "status": "deployed",
        "pid": 12345
    }
    """
    try:
        db = SessionLocal()
        try:
            agent = db.query(AgentConfigModel).filter(
                AgentConfigModel.id == agent_id
            ).first()

            if not agent:
                return jsonify({'error': 'Agent not found'}), 404

            # Get agent directory
            agent_dir = get_agent_directory(agent_id, agent.name)

            # Start the agent process
            result = start_agent_process(agent_id, agent.name, agent_dir)

            if result.get('success'):
                # Update database status
                agent.status = 'deployed'
                db.commit()

                return jsonify({
                    'success': True,
                    'status': 'deployed',
                    'pid': result.get('pid'),
                    'message': result.get('message')
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('message')
                }), 500
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error deploying agent: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to deploy agent', 'details': str(e)}), 500

@agent_api.route('/agents/<agent_id>/undeploy', methods=['POST'])
@cross_origin()
def undeploy_agent(agent_id: str):
    """
    Undeploy/stop an agent

    POST /api/user/agents/{agent_id}/undeploy

    Returns: {
        "success": true,
        "status": "inactive",
        "message": "Agent stopped"
    }
    """
    try:
        db = SessionLocal()
        try:
            agent = db.query(AgentConfigModel).filter(
                AgentConfigModel.id == agent_id
            ).first()

            if not agent:
                return jsonify({'error': 'Agent not found'}), 404

            # Get agent directory
            agent_dir = get_agent_directory(agent_id, agent.name)

            # Stop the agent process
            result = stop_agent_process(agent_id, agent.name, agent_dir)

            if result.get('success'):
                # Update database status
                agent.status = 'inactive'
                db.commit()

                return jsonify({
                    'success': True,
                    'status': 'inactive',
                    'message': result.get('message')
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('message')
                }), 500
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error undeploying agent: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to undeploy agent', 'details': str(e)}), 500


# Register blueprint in your main Flask app:
# from agent_api import agent_api
# app.register_blueprint(agent_api)
