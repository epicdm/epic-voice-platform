"""
User Dashboard for Multi-Tenant Voice Agent Platform
Allows users to create and manage their own voice agents.
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from flasgger import Swagger
from database import Base, User, AgentConfig, PhoneMapping, CallLog, SIPConfig, LiveKitAgent, SessionLocal
from sqlalchemy import func, cast, Float
import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import sys
import os
import json
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from agent_creator import AgentCreator
from phone_number_manager import PhoneNumberManager
from backend.agent_health_check import start_agent_process, stop_agent_process, get_agent_directory

# Import livekit API and telephony integration
from livekit import api
from livekit_telephony import telephony_manager
import asyncio
import logging

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize Socket.IO for Real-time Dashboard
from backend.realtime_dashboard.socketio_server import init_socketio
socketio = init_socketio(app)
print("✅ Socket.IO initialized for real-time dashboard")

# Initialize phone manager
phone_manager = PhoneNumberManager()

# Register SIP webhook handler
from sip_inbound_handler import create_sip_webhook_handler
create_sip_webhook_handler(app)

# Register LiveKit webhook handler for call outcome tracking
from livekit_webhook_listener import create_webhook_endpoint
from call_outcome_processor import CallOutcomeProcessor

# Initialize call outcome processor
call_outcome_processor = CallOutcomeProcessor()

# Register LiveKit webhook endpoint using API credentials
livekit_api_key = os.getenv('LIVEKIT_API_KEY', '')
livekit_api_secret = os.getenv('LIVEKIT_API_SECRET', '')

if livekit_api_key and livekit_api_secret:
    create_webhook_endpoint(app, call_outcome_processor, livekit_api_key, livekit_api_secret)
    print("✅ LiveKit webhook endpoint registered for call outcome tracking")
else:
    print("⚠️  LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set - call outcome tracking disabled")

app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# Register Call Outcomes and CSV Export blueprints (metadata → call_metadata fix applied)
from backend.exports.routes import exports_bp
app.register_blueprint(exports_bp)
print("✅ CSV Export API registered at /api/exports")

from backend.call_outcomes.routes import call_outcomes_bp
app.register_blueprint(call_outcomes_bp)
print("✅ Call Outcomes API registered at /api/call-outcomes")

# Register Rate Limiting Management API
from backend.rate_limiting.routes import rate_limits_bp
app.register_blueprint(rate_limits_bp)
print("✅ Rate Limiting API registered at /api/rate-limits")

# Register Real-time Dashboard API
from backend.realtime_dashboard.routes import dashboard_bp
app.register_blueprint(dashboard_bp)
print("✅ Real-time Dashboard API registered at /api/dashboard")

# Register Call Transcripts API
from backend.call_transcripts.routes import transcripts_bp
app.register_blueprint(transcripts_bp)
print("✅ Call Transcripts API registered at /api/transcripts")

# Register Live Listen API
from backend.live_listen.routes import live_listen_bp
app.register_blueprint(live_listen_bp)
print("✅ Live Listen API registered at /api/live-listen")

# Register Funnel Engine API
from backend.funnel_engine.routes import funnel_bp
app.register_blueprint(funnel_bp)
print("✅ Funnel Engine API registered at /api/user/funnels")

# Register Funnel Webhook API
from backend.funnel_engine.webhooks import funnel_webhook_bp
app.register_blueprint(funnel_webhook_bp)
print("✅ Funnel Webhooks registered at /api/funnels/webhooks")

# Register Public Landing Pages (no auth required)
from backend.public_landing_pages import public_lp_bp
app.register_blueprint(public_lp_bp)
print("✅ Public Landing Pages registered at /l/{funnel-id}")

# Register Brand Kit API
from backend.brand_kit.routes import brand_kit_api
app.register_blueprint(brand_kit_api)
print("✅ Brand Kit API registered at /api/user/brand-kits")

# Register Admin Settings API
from backend.admin_settings.routes import admin_settings_api, admin_dashboard_api
app.register_blueprint(admin_settings_api)
app.register_blueprint(admin_dashboard_api)
print("✅ Admin Settings API registered at /api/admin/settings")

# Register Calendar OAuth API
from backend.calendar_oauth import calendar_oauth_bp
app.register_blueprint(calendar_oauth_bp)
print("✅ Calendar OAuth API registered at /api/user/calendar")
print("✅ Admin Dashboard API registered at /api/admin/dashboard")

# Register FreeSWITCH Provisioning API
from backend.freeswitch_routes import freeswitch_bp
app.register_blueprint(freeswitch_bp)
print("✅ FreeSWITCH Provisioning API registered at /api/freeswitch")

# SIP Status API
from backend.sip_status_api import sip_status_bp
app.register_blueprint(sip_status_bp)
print("✅ SIP Status API registered")

# Register Agent Tools API (Knowledge Base, FAQs, Tool Configuration)
from backend.agent_tools.routes import register_agent_tools_routes
register_agent_tools_routes(app)

# Enable CORS for frontend (including WebSocket)
# When using credentials, specific origins must be listed (cannot use wildcard)
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3003',
    'https://ai.epic.dm',
    'http://ai.epic.dm',
    'https://epic-voice-platform.vercel.app',
    'https://epic-voice-platform-d3ppl1fw5.vercel.app',
    'https://epic-voice-platform-khm464elm.vercel.app'
])

# Swagger/OpenAPI Documentation Configuration
swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "LiveKit Voice Agent Platform API",
        "description": "REST API for managing voice agents, phone numbers, calls, and exporting data. Supports multi-tenant architecture with authentication.",
        "version": "1.0.0",
        "contact": {
            "name": "Epic Voice Platform",
            "url": "https://ai.epic.dm"
        }
    },
    "host": "ai.epic.dm",
    "basePath": "/",
    "schemes": ["https", "http"],
    "securityDefinitions": {
        "SessionAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "Cookie",
            "description": "Session-based authentication via Flask-Login. Login at /api/auth/login to establish session."
        },
        "EmailHeader": {
            "type": "apiKey",
            "in": "header",
            "name": "X-User-Email",
            "description": "User email for development/testing. Production uses session authentication."
        }
    },
    "tags": [
        {
            "name": "Authentication",
            "description": "User login, logout, and session management"
        },
        {
            "name": "CSV Exports",
            "description": "Export data as CSV files with filtering and date ranges"
        },
        {
            "name": "Call Outcomes",
            "description": "Track and manage call outcomes and results"
        },
        {
            "name": "Real-time Dashboard",
            "description": "Live metrics and active call monitoring"
        },
        {
            "name": "Call Transcripts",
            "description": "Retrieve call transcripts and conversation logs"
        },
        {
            "name": "Rate Limiting",
            "description": "API rate limit management and monitoring"
        }
    ]
}

swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,  # All endpoints
            "model_filter": lambda tag: True,  # All models
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs"
}

swagger = Swagger(app, template=swagger_template, config=swagger_config)
print("✅ OpenAPI/Swagger documentation available at /api/docs")

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class UserLogin(UserMixin):
    def __init__(self, user_id):
        self.id = user_id

@login_manager.user_loader
def load_user(user_id):
    return UserLogin(user_id)

# Routes
@app.route('/')
def index():
    """Landing page."""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login."""
    if request.method == 'POST':
        data = request.json
        db = SessionLocal()
        
        user = db.query(User).filter(User.email == data['email']).first()

        if user and user.password and check_password_hash(user.password, data['password']):
            session['user_id'] = user.id
            login_user(UserLogin(user.id))
            db.close()
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name
                }
            })
        
        db.close()
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    
    return render_template('login.html')

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """API login endpoint for Next.js frontend."""
    data = request.json
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.email == data.get('email')).first()

        if user and user.password and check_password_hash(user.password, data.get('password', '')):
            # Set session for Flask
            session['user_id'] = user.id
            
            # Return user data for frontend
            response = jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name
                }
            })
            
            # Set cookie for easier authentication
            response.set_cookie('user_id', user.id, httponly=False, samesite='Lax')
            response.set_cookie('user_email', user.email, httponly=False, samesite='Lax')
            
            return response
        
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    finally:
        db.close()

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration."""
    if request.method == 'POST':
        data = request.json
        db = SessionLocal()
        
        # Check if user exists
        existing = db.query(User).filter(User.email == data['email']).first()
        if existing:
            db.close()
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            id=str(uuid.uuid4()),
            email=data['email'],
            password=generate_password_hash(data['password']),
            name=data['name']
        )
        db.add(user)
        db.commit()
        
        user_id = user.id
        db.close()
        
        return jsonify({'success': True, 'user_id': user_id})
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    """User logout."""
    session.pop('user_id', None)
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    """Main user dashboard."""
    return render_template('user_dashboard.html')

# Helper function for authentication
def get_current_user_id():
    """Get current user ID from session or authorization header."""
    # LOCALHOST BYPASS: Return test UUID for local development
    if request.host.startswith('localhost') or request.host.startswith('127.0.0.1'):
        return "00000000-0000-0000-0000-000000000001"

    # Check Flask session first
    if 'user_id' in session:
        return session['user_id']
    
    # Check Authorization header (for Next.js frontend)
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.replace('Bearer ', '')
        # Decode user ID from token (simple implementation)
        # In production, use proper JWT validation
        try:
            import jwt
            decoded = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            return decoded.get('user_id')
        except:
            pass
    
    # Check for user_id in cookies (NextAuth)
    user_id_cookie = request.cookies.get('user_id')
    if user_id_cookie:
        return user_id_cookie
    
    # Check for email in headers and look up user
    user_email = request.headers.get('X-User-Email')
    logger.debug(f"🔍 X-User-Email header = {user_email}")
    logger.debug(f"🔍 All headers = {dict(request.headers)}")
    if user_email:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == user_email).first()
            
            # Auto-create user if they don't exist (for NextAuth integration)
            if not user:
                import uuid
                from werkzeug.security import generate_password_hash
                
                user = User(
                    id=str(uuid.uuid4()),
                    email=user_email,
                    name=user_email.split('@')[0].title(),  # Extract name from email
                    password=generate_password_hash(str(uuid.uuid4())),  # Random password
                    isActive=True
                )
                db.add(user)
                db.commit()
                logger.info(f"✅ Auto-created user: {user_email} with ID: {user.id}")

            logger.debug(f"🔍 Found user ID: {user.id} for email: {user_email}")
            return user.id
        finally:
            db.close()
    
    # NO FALLBACK - require authentication
    return None

# API Endpoints
@app.route('/api/user/profile')
def get_profile():
    """Get user profile."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        db.close()
        return jsonify({'error': 'User not found'}), 404

    profile = {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'image': user.image,
        'created_at': user.createdAt.isoformat(),
        'is_active': user.isActive,
        'onboarding_completed': user.onboardingCompleted
    }
    db.close()
    return jsonify({'success': True, 'data': profile})

def serialize_agent(agent):
    """Serialize agent config to dict with all fields."""
    return {
        'id': agent.id,
        'name': agent.name,
        'description': agent.description or '',  # Convert None to empty string
        'status': agent.status or 'created',  # Ensure status is returned to the frontend
        'is_active': agent.isActive if hasattr(agent, 'isActive') else True,  # Active status for frontend display
        'instructions': agent.instructions,
        'created_at': agent.createdAt.isoformat(),
        'updated_at': agent.updatedAt.isoformat(),
        # Core Configuration
        'agent_mode': agent.agentMode or 'standard',
        'language': agent.language,
        'temperature': agent.temperature,
        # LLM Configuration
        'llm_provider': agent.llmProvider or 'openai',
        'llm_model': agent.llmModel,
        # STT Configuration
        'stt_provider': agent.sttProvider or 'deepgram',
        'stt_model': agent.sttModel or 'nova-2',
        'stt_language': agent.sttLanguage or 'en',
        # TTS Configuration
        'tts_provider': agent.ttsProvider or 'openai',
        'tts_model': agent.ttsModel,
        'tts_voice_id': agent.ttsVoiceId,
        'voice': agent.voice,
        # Realtime API
        'realtime_voice': agent.realtimeVoice or 'alloy',
        # VAD Configuration
        'vad_enabled': agent.vadEnabled if agent.vadEnabled is not None else True,
        'vad_provider': agent.vadProvider or 'silero',
        # Turn Detection
        'turn_detection_model': agent.turnDetectionModel or 'multilingual',
        # Noise Cancellation
        'noise_cancellation_enabled': agent.noiseCancellationEnabled if agent.noiseCancellationEnabled is not None else True,
        'noise_cancellation_type': agent.noiseCancellationType or 'BVC',
        # Advanced Session Options
        'preemptive_generation': agent.preemptiveGeneration or False,
        'resume_false_interruption': agent.resumeFalseInterruption or False,
        'false_interruption_timeout': agent.falseInterruptionTimeout or 1.0,
        'min_interruption_duration': agent.minInterruptionDuration or 0.2,
        # Greeting
        'greeting_enabled': agent.greetingEnabled if agent.greetingEnabled is not None else True,
        'greeting_message': agent.greetingMessage,
        # Phone Number
        'did_number': agent.did_number if hasattr(agent, 'did_number') and agent.did_number else None,
    }

@app.route('/api/user/agents', methods=['GET'])
def get_agents():
    """Get all agents for current user."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    agents = db.query(AgentConfig).filter(
        AgentConfig.userId == user_id,
        AgentConfig.isActive == True
    ).all()

    # Get phone mappings with trunk IDs for each agent
    result = []
    for agent in agents:
        agent_data = serialize_agent(agent)

        # Get phone mapping for this agent
        phone_mapping = db.query(PhoneMapping).filter(
            PhoneMapping.agentConfigId == agent.id,
            PhoneMapping.isActive == True
        ).first()

        if phone_mapping:
            agent_data['phone_number'] = phone_mapping.phoneNumber
            agent_data['sip_trunk_id'] = phone_mapping.sipTrunkId
            # Also set did_number for frontend compatibility
            agent_data['did_number'] = phone_mapping.phoneNumber
        else:
            agent_data['phone_number'] = None
            agent_data['sip_trunk_id'] = None
            # Use did_number from agent_configs if no phone mapping (fallback)
            # did_number already set by serialize_agent

        result.append(agent_data)

    db.close()
    return jsonify({
        'success': True,
        'data': result
    })

@app.route('/api/user/agents/<agent_id>', methods=['GET'])
def get_agent(agent_id):
    """Get single agent by ID."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            'success': False,
            'error': {
                'message': 'Authentication required',
                'code': 'UNAUTHORIZED'
            }
        }), 401

    db = SessionLocal()
    agent = db.query(AgentConfig).filter(
        AgentConfig.id == agent_id,
        AgentConfig.userId == user_id,
        AgentConfig.isActive == True
    ).first()

    if not agent:
        db.close()
        return jsonify({
            'success': False,
            'error': {
                'message': 'Agent not found',
                'code': 'NOT_FOUND'
            }
        }), 404

    result = serialize_agent(agent)

    # Include phone_number_ids for edit form
    from phone_number_manager import PhoneNumberPool
    phone_mapping = db.query(PhoneMapping).filter(
        PhoneMapping.agentConfigId == agent.id,
        PhoneMapping.isActive == True
    ).first()

    if phone_mapping:
        # Find the phone number ID from phone_number_pool
        phone = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone_mapping.phoneNumber
        ).first()
        if phone:
            result['phone_number_ids'] = [phone.id]
        else:
            result['phone_number_ids'] = []
    else:
        result['phone_number_ids'] = []

    # Include tools_config for edit form (Step 5)
    from backend.agent_tools.models import AgentTool
    agent_tools = db.query(AgentTool).filter(
        AgentTool.agentconfigid == agent_id,
        AgentTool.isenabled == True
    ).all()

    # Build tools_config object from database tools
    tools_config = {}
    for tool in agent_tools:
        tools_config[tool.tooltype] = {'enabled': tool.isenabled}

    result['tools_config'] = tools_config

    db.close()
    return jsonify({
        'success': True,
        'data': result
    })

@app.route('/api/user/agents/<agent_id>', methods=['PUT', 'PATCH'])
def update_agent(agent_id):
    """Update agent configuration."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404

        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        db = SessionLocal()
        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id,
            AgentConfig.isActive == True
        ).first()
        
        if not agent:
            db.close()
            return jsonify({'error': 'Agent not found'}), 404
        
        # Update agent fields
        if 'name' in data:
            agent.name = data['name']
        if 'instructions' in data:
            agent.instructions = data['instructions']
        if 'description' in data:
            agent.description = data.get('description')
        if 'agent_mode' in data:
            agent.agentMode = data.get('agent_mode')
        if 'language' in data:
            agent.language = data.get('language')
        if 'temperature' in data:
            agent.temperature = data.get('temperature')
        if 'llm_provider' in data:
            agent.llmProvider = data.get('llm_provider')
        if 'llm_model' in data:
            agent.llmModel = data.get('llm_model')
        if 'stt_provider' in data:
            agent.sttProvider = data.get('stt_provider')
        if 'stt_model' in data:
            agent.sttModel = data.get('stt_model')
        if 'stt_language' in data:
            agent.sttLanguage = data.get('stt_language')
        if 'tts_provider' in data:
            agent.ttsProvider = data.get('tts_provider')
        if 'tts_model' in data:
            agent.ttsModel = data.get('tts_model')
        if 'tts_voice_id' in data:
            agent.ttsVoiceId = data.get('tts_voice_id')
        if 'voice' in data:
            agent.voice = data.get('voice')
        if 'realtime_voice' in data:
            agent.realtimeVoice = data.get('realtime_voice')
        if 'vad_enabled' in data:
            agent.vadEnabled = data.get('vad_enabled')
        if 'vad_provider' in data:
            agent.vadProvider = data.get('vad_provider')
        if 'turn_detection_model' in data:
            agent.turnDetectionModel = data.get('turn_detection_model')
        if 'noise_cancellation_enabled' in data:
            agent.noiseCancellationEnabled = data.get('noise_cancellation_enabled')
        if 'noise_cancellation_type' in data:
            agent.noiseCancellationType = data.get('noise_cancellation_type')
        if 'preemptive_generation' in data:
            agent.preemptiveGeneration = data.get('preemptive_generation')
        if 'resume_false_interruption' in data:
            agent.resumeFalseInterruption = data.get('resume_false_interruption')
        if 'false_interruption_timeout' in data:
            agent.falseInterruptionTimeout = data.get('false_interruption_timeout')
        if 'min_interruption_duration' in data:
            agent.minInterruptionDuration = data.get('min_interruption_duration')
        if 'greeting_enabled' in data:
            agent.greetingEnabled = data.get('greeting_enabled')
        if 'greeting_message' in data:
            agent.greetingMessage = data.get('greeting_message')

        # Handle phone number assignment updates
        if 'phone_number_ids' in data:
            phone_number_ids = data.get('phone_number_ids', [])
            from phone_number_manager import PhoneNumberPool

            # Deactivate existing phone mappings for this agent
            existing_mappings = db.query(PhoneMapping).filter(
                PhoneMapping.agentConfigId == agent_id,
                PhoneMapping.isActive == True
            ).all()

            for mapping in existing_mappings:
                mapping.isActive = False
                # Update phone number pool to mark as unassigned
                phone = db.query(PhoneNumberPool).filter(
                    PhoneNumberPool.phone_number == mapping.phoneNumber
                ).first()
                if phone:
                    phone.assigned_to_agent_id = None
                    phone.status = 'available'

            # Create new phone mappings for selected phone numbers
            if phone_number_ids and len(phone_number_ids) > 0:
                for phone_id in phone_number_ids:
                    # Check if phone number exists and belongs to user
                    phone = db.query(PhoneNumberPool).filter(
                        PhoneNumberPool.id == phone_id,
                        PhoneNumberPool.assigned_to_user_id == user_id
                    ).first()

                    if phone:
                        # Check if an inactive mapping already exists for this phone number
                        # (to avoid UNIQUE constraint violation on phoneNumber)
                        existing_phone_mapping = db.query(PhoneMapping).filter(
                            PhoneMapping.phoneNumber == phone.phone_number
                        ).first()

                        if existing_phone_mapping:
                            # Reactivate and update existing mapping
                            existing_phone_mapping.agentConfigId = agent_id
                            existing_phone_mapping.userId = user_id
                            existing_phone_mapping.sipTrunkId = phone.livekit_inbound_trunk_id
                            existing_phone_mapping.isActive = True
                            print(f"♻️  Reactivated phone mapping {phone.phone_number} for agent {agent.name}")
                        else:
                            # Create new phone mapping (first time assignment)
                            phone_mapping = PhoneMapping(
                                id=str(uuid.uuid4()),
                                phoneNumber=phone.phone_number,
                                agentConfigId=agent_id,
                                sipTrunkId=phone.livekit_inbound_trunk_id,
                                userId=user_id,
                                isActive=True
                            )
                            db.add(phone_mapping)
                            print(f"✅ Created new phone mapping {phone.phone_number} for agent {agent.name}")

                        # Update phone number pool to mark as assigned
                        phone.assigned_to_agent_id = agent_id
                        phone.status = 'assigned'
                        phone.assigned_at = datetime.utcnow()

        # Handle tools configuration updates from Step 5
        if 'tools_config' in data:
            tools_config = data.get('tools_config', {})
            if tools_config:
                from backend.agent_tools.models import AgentTool
                import json

                # Tool name mappings
                tool_names = {
                    'knowledge_base': 'Knowledge Base',
                    'calendar': 'Calendar Booking',
                    'email': 'Email Follow-up',
                    'web_search': 'Web Search',
                    'handoff': 'Human Handoff',
                    'sms': 'SMS Follow-up',
                    'webhooks': 'Custom Webhooks'
                }

                # Delete existing tools for this agent
                existing_tools = db.query(AgentTool).filter(
                    AgentTool.agentconfigid == agent_id
                ).all()

                for tool in existing_tools:
                    db.delete(tool)

                # Flush deletions to database before inserting new tools
                # This prevents UNIQUE constraint violations
                db.flush()

                # Create new tool configurations for enabled tools
                for tool_type, tool_config in tools_config.items():
                    if isinstance(tool_config, dict) and tool_config.get('enabled', False):
                        tool = AgentTool(
                            id=str(uuid.uuid4()),
                            agentconfigid=agent_id,
                            userid=user_id,
                            tooltype=tool_type,
                            toolname=tool_names.get(tool_type, tool_type),
                            isenabled=True,
                            config=json.dumps(tool_config)
                        )
                        db.add(tool)

                print(f"✅ Updated {len([t for t in tools_config.values() if isinstance(t, dict) and t.get('enabled')])} tool configurations")

        db.commit()
        result = serialize_agent(agent)
        db.close()

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        print(f'Error updating agent: {e}')
        return jsonify({
            'success': False,
            'error': {
                'message': str(e),
                'code': 'UPDATE_FAILED'
            }
        }), 500

@app.route('/api/user/agents', methods=['POST'])
def create_agent():
    """Create new agent configuration."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404

        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        db = SessionLocal()

        agent = AgentConfig(
            id=str(uuid.uuid4()),
            userId=user_id,
            name=data['name'],
            instructions=data['instructions'],
            # Core Configuration
            agentMode=data.get('agent_mode', 'standard'),
            language=data.get('language', 'en-US'),
            temperature=data.get('temperature', 0.7),
            # LLM Configuration
            llmProvider=data.get('llm_provider', 'openai'),
            llmModel=data.get('llm_model', 'gpt-4o-mini'),
            # STT Configuration
            sttProvider=data.get('stt_provider', 'deepgram'),
            sttModel=data.get('stt_model', 'nova-2'),
            sttLanguage=data.get('stt_language', 'en'),
            # TTS Configuration
            ttsProvider=data.get('tts_provider', 'openai'),
            ttsModel=data.get('tts_model'),
            ttsVoiceId=data.get('tts_voice_id'),
            voice=data.get('voice', 'alloy'),
            # Realtime API
            realtimeVoice=data.get('realtime_voice', 'alloy'),
            # VAD Configuration
            vadEnabled=data.get('vad_enabled', True),
            vadProvider=data.get('vad_provider', 'silero'),
            # Turn Detection
            turnDetectionModel=data.get('turn_detection_model', 'multilingual'),
            # Noise Cancellation
            noiseCancellationEnabled=data.get('noise_cancellation_enabled', True),
            noiseCancellationType=data.get('noise_cancellation_type', 'BVC'),
            # Advanced Session Options
            preemptiveGeneration=data.get('preemptive_generation', False),
            resumeFalseInterruption=data.get('resume_false_interruption', False),
            falseInterruptionTimeout=data.get('false_interruption_timeout', 1.0),
            minInterruptionDuration=data.get('min_interruption_duration', 0.2),
            # Greeting
            greetingEnabled=data.get('greeting_enabled', True),
            greetingMessage=data.get('greeting_message'),
        )

        db.add(agent)
        db.commit()
        
        agent_id = agent.id
        
        # Generate LiveKit agent files
        try:
            agent_creator = AgentCreator()
            agent_file_config = {
                'name': data['name'],
                'description': data.get('description', ''),
                'instructions': data['instructions'],
                'personality': data.get('personality', 'friendly'),
                'llm': {
                    'model': data.get('llm_model', 'gpt-4o-mini'),
                    'temperature': data.get('temperature', 0.7)
                },
                'stt': {
                    'model': f"deepgram-{data.get('stt_model', 'nova-2')}"
                },
                'tts': {
                    'voice': f"openai-{data.get('voice', 'alloy')}"
                },
                'features': {
                    'preemptiveGeneration': data.get('preemptive_generation', False),
                    'resumeFalseInterruption': data.get('resume_false_interruption', False),
                    'transcriptionEnabled': True
                }
            }
            
            result = agent_creator.create_agent(agent_file_config)
            
            # Update agent with file path
            agent.filePath = result['path']
            agent.agentId = result['agent_id']
            db.commit()
            
            print(f"✅ Created agent files at: {result['path']}")
            
        except Exception as e:
            print(f"⚠️  Failed to generate agent files: {e}")
            # Don't fail the whole request if file generation fails

        # DEBUG: Check if we reach this point
        with open('/tmp/provisioning_debug.log', 'a') as f:
            ts = datetime.now().isoformat()
            f.write(f"\n{ts} - BEFORE PROVISIONING SECTION - Agent file generation complete\n")
            f.write(f"{ts} - Agent ID: {agent_id}\n")
            f.write(f"{ts} - Agent name: {data.get('name')}\n")

        # Check if phone numbers were selected in Step 4 of wizard
        phone_number_ids = data.get('phone_number_ids', [])

        # Only auto-provision if NO phone numbers were selected
        # If phone numbers were selected, they already have SIP accounts from inventory
        if not phone_number_ids or len(phone_number_ids) == 0:
            # Auto-provision Magnus Billing SIP account for agent
            # This creates:
            # - SIP account with unique username (+17678189xxx)
            # - DID/phone number (17678189xxx)
            # - Inbound/outbound routing

            # DEBUG: Write to file to track provisioning
            with open('/tmp/provisioning_debug.log', 'a') as f:
                ts = datetime.now().isoformat()
                f.write(f"\n{ts} - PROVISIONING STARTED for agent: {data['name']}\n")
                f.write(f"{ts} - No phone_number_ids provided, auto-provisioning new SIP account\n")

            print(f"🔧 Starting Magnus Billing provisioning for agent: {data['name']}")
            try:
                with open('/tmp/provisioning_debug.log', 'a') as f:
                    f.write(f"{ts} - Importing provisioning hooks...\n")

                print(f"🔧 Importing provisioning hooks...")
                from backend.agent_provisioning_hooks import on_agent_created
                print(f"🔧 Import successful")

                with open('/tmp/provisioning_debug.log', 'a') as f:
                    f.write(f"{ts} - Import successful\n")

                # Get user email for provisioning
                user = db.query(User).filter(User.id == user_id).first()
                user_email = user.email if user else f"user-{user_id}@ai.epic.dm"
                print(f"🔧 User email: {user_email}")

                with open('/tmp/provisioning_debug.log', 'a') as f:
                    f.write(f"{ts} - User email: {user_email}\n")
                    f.write(f"{ts} - Agent ID: {agent.id}\n")
                    f.write(f"{ts} - Agent name: {data['name']}\n")

                # Provision complete SIP account via Magnus Billing
                print(f"🔧 Calling Magnus Billing API...")

                with open('/tmp/provisioning_debug.log', 'a') as f:
                    f.write(f"{ts} - Calling on_agent_created...\n")

                provisioning_result = on_agent_created(
                    agent_config_id=agent.id,
                    agent_name=data['name'],
                    user_email=user_email,
                    livekit_room_name=f"agent-{agent.id}"
                )
                print(f"🔧 Provisioning result: {provisioning_result.get('success')}")

                with open('/tmp/provisioning_debug.log', 'a') as f:
                    f.write(f"{ts} - Provisioning result: {provisioning_result}\n")

                if provisioning_result['success']:
                    # Store SIP credentials in database
                    sip_creds = provisioning_result['sip_credentials']
                    print(f"🔧 Storing SIP credentials in database...")

                    # Update agent with SIP credentials
                    # Note: Magnus returns magnus_sip_id (integer), FusionPBX returns fusionpbx_agent_uuid (UUID)
                    # Only set UUID fields if they're actually UUIDs, not Magnus integer IDs
                    agent.fusionpbx_agent_uuid = provisioning_result.get('fusionpbx_agent_uuid')  # Only set if UUID
                    agent.sip_username = sip_creds['sip_username']
                    agent.sip_password = sip_creds['sip_password']
                    agent.sip_extension = sip_creds['did_number']  # Just DID (fits VARCHAR(10))
                    agent.sip_domain = sip_creds['sip_domain']
                    agent.sip_server = sip_creds['sip_server']
                    agent.did_number = sip_creds['did_number']
                    agent.fusionpbx_extension_uuid = provisioning_result.get('extension_uuid')  # Only set if UUID
                    agent.fusionpbx_did_uuid = provisioning_result.get('did_uuid')  # Only set if UUID

                    # Store Magnus IDs separately if available (for reference/debugging)
                    if 'magnus_sip_id' in provisioning_result:
                        print(f"🔧 Magnus SIP ID: {provisioning_result['magnus_sip_id']}")
                    if 'magnus_did_id' in provisioning_result:
                        print(f"🔧 Magnus DID ID: {provisioning_result['magnus_did_id']}")

                    # Store Magnus user info (for consolidated billing)
                    # With RocketChat sync endpoint, extension is the user identifier
                    user_api_key = provisioning_result.get('user_api_key')
                    user_uuid = provisioning_result.get('user_uuid')

                    if user_api_key and not user.fusionpbx_api_key:
                        # Store extension as user API key for consolidated billing
                        user.fusionpbx_api_key = user_api_key
                        print(f"🔧 Stored Magnus user identifier (extension): {user_api_key}")

                    if user_uuid and not user.fusionpbx_user_uuid:
                        # Store extension as user UUID (Magnus user identifier)
                        user.fusionpbx_user_uuid = user_uuid
                        print(f"🔧 Stored Magnus user UUID (extension): {user_uuid}")

                    # Explicitly add to session and commit
                    db.add(agent)
                    db.add(user)  # Save user changes too
                    db.flush()
                    db.commit()
                    print(f"🔧 Database commit successful")

                    # Verify the data was saved
                    db.refresh(agent)
                    db.refresh(user)
                    print(f"🔧 Verification: agent.sip_username = {agent.sip_username}")
                    print(f"🔧 Verification: agent.did_number = {agent.did_number}")
                    print(f"🔧 Verification: user.fusionpbx_api_key = {user.fusionpbx_api_key[:16] if user.fusionpbx_api_key else 'None'}...")

                    print(f"✅ Magnus Billing: Agent {data['name']} provisioned")
                    print(f"   Extension: {sip_creds['sip_username']}")
                    print(f"   DID: {sip_creds['did_number']}")
                    print(f"   SIP Server: {sip_creds['sip_server']}")
                    print(f"   User API Key: {user_api_key[:16] if user_api_key else 'N/A'}... (for billing)")
                else:
                    print(f"⚠️  Magnus Billing provisioning failed: {provisioning_result.get('error')}")
                    # Don't fail agent creation if provisioning fails

            except Exception as prov_error:
                with open('/tmp/provisioning_debug.log', 'a') as f:
                    import traceback
                    ts = datetime.now().isoformat()
                    f.write(f"{ts} - EXCEPTION during provisioning: {str(prov_error)}\n")
                    f.write(f"{ts} - Traceback:\n{traceback.format_exc()}\n")

                print(f"❌ Magnus Billing provisioning error: {prov_error}")
                import traceback
                traceback.print_exc()
                # Don't fail agent creation if provisioning fails
        else:
            # Phone numbers were selected - use existing SIP credentials from inventory
            with open('/tmp/provisioning_debug.log', 'a') as f:
                ts = datetime.now().isoformat()
                f.write(f"\n{ts} - SKIPPING auto-provisioning - {len(phone_number_ids)} phone number(s) selected\n")
            print(f"✅ Skipping auto-provisioning - using selected phone number(s) from inventory")

        # Handle phone number assignment if provided

        # DEBUG: Write to file to bypass buffering
        with open('/tmp/agent_debug.log', 'a') as f:
            timestamp = datetime.now().isoformat()
            f.write(f"\n{timestamp} - phone_number_ids from request: {phone_number_ids}\n")
            f.write(f"{timestamp} - phone_number_ids type: {type(phone_number_ids)}\n")
            f.write(f"{timestamp} - phone_number_ids length: {len(phone_number_ids) if phone_number_ids else 0}\n")
            f.write(f"{timestamp} - user_id: {user_id}\n")
            f.write(f"{timestamp} - agent_id: {agent_id}\n")

        print(f"🔍 DEBUG: phone_number_ids from request: {phone_number_ids}")
        print(f"🔍 DEBUG: phone_number_ids type: {type(phone_number_ids)}")
        print(f"🔍 DEBUG: phone_number_ids length: {len(phone_number_ids) if phone_number_ids else 0}")

        if phone_number_ids and len(phone_number_ids) > 0:
            with open('/tmp/agent_debug.log', 'a') as f:
                ts = datetime.now().isoformat()
                f.write(f"{ts} - ENTERING phone assignment block with {len(phone_number_ids)} phone number(s)\n")

            print(f"✅ DEBUG: Entering phone assignment block with {len(phone_number_ids)} phone number(s)")
            try:
                from phone_number_manager import PhoneNumberPool

                for phone_id in phone_number_ids:
                    with open('/tmp/agent_debug.log', 'a') as f:
                        ts = datetime.now().isoformat()
                        f.write(f"{ts} - Processing phone_id: {phone_id}\n")

                    print(f"🔍 DEBUG: Processing phone_id: {phone_id}")
                    # Check if phone number exists and belongs to user
                    phone = db.query(PhoneNumberPool).filter(
                        PhoneNumberPool.id == phone_id,
                        PhoneNumberPool.assigned_to_user_id == user_id
                    ).first()

                    with open('/tmp/agent_debug.log', 'a') as f:
                        ts = datetime.now().isoformat()
                        f.write(f"{ts} - Phone lookup result: {phone is not None}\n")
                        if phone:
                            f.write(f"{ts} - Phone number: {phone.phone_number}\n")
                            f.write(f"{ts} - Phone assigned_to_user_id: {phone.assigned_to_user_id}\n")
                        else:
                            f.write(f"{ts} - Phone not found or doesn't belong to user\n")

                    if phone:
                        # Assign phone number to agent via phone_mappings table
                        phone_mapping = PhoneMapping(
                            id=str(uuid.uuid4()),
                            phoneNumber=phone.phone_number,  # PhoneNumberPool uses snake_case
                            agentConfigId=agent_id,
                            sipTrunkId=phone.livekit_inbound_trunk_id,  # PhoneNumberPool uses snake_case
                            userId=user_id,
                            isActive=True
                        )
                        db.add(phone_mapping)

                        # Update phone number pool to mark as assigned
                        phone.assigned_to_agent_id = agent_id  # PhoneNumberPool uses snake_case
                        phone.status = 'assigned'
                        phone.assigned_at = datetime.utcnow()  # PhoneNumberPool uses snake_case

                        print(f"✅ Assigned phone {phone.phone_number} to agent {data['name']}")

                        # ✅ FIX: Create LiveKit dispatch rule for incoming calls
                        # CRITICAL: Use physical agent name (tst0002), NOT virtual agent ID
                        # The physical agent dynamically routes to virtual agents based on room name
                        with open('/tmp/agent_debug.log', 'a') as f:
                            ts = datetime.now().isoformat()
                            f.write(f"{ts} - DISPATCH RULE CHECK: trunk_id={phone.livekit_inbound_trunk_id}\n")

                        if phone.livekit_inbound_trunk_id:
                            try:
                                with open('/tmp/agent_debug.log', 'a') as f:
                                    ts = datetime.now().isoformat()
                                    f.write(f"{ts} - ENTERING dispatch rule creation for {phone.phone_number}\n")

                                import asyncio
                                from livekit import api

                                # Physical agent name from config
                                PHYSICAL_AGENT_NAME = os.getenv('AGENT_NAME', 'tst0002')

                                # Strip + from phone number for room prefix
                                phone_digits = phone.phone_number.replace('+', '')

                                with open('/tmp/agent_debug.log', 'a') as f:
                                    ts = datetime.now().isoformat()
                                    f.write(f"{ts} - Creating dispatch rule with async function\n")

                                # Initialize LiveKit connection details
                                livekit_url = os.getenv('LIVEKIT_URL', '').replace('wss://', 'https://')
                                livekit_api_key = os.getenv('LIVEKIT_API_KEY')
                                livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

                                # Create dispatch rule asynchronously (entire operation in one async function)
                                async def create_dispatch_rule_async():
                                    # Create LiveKit API client inside async context
                                    lkapi = api.LiveKitAPI(
                                        url=livekit_url,
                                        api_key=livekit_api_key,
                                        api_secret=livekit_api_secret
                                    )

                                    try:
                                        # Create room config with physical agent dispatch
                                        room_config = api.RoomConfiguration()
                                        agent_dispatch = room_config.agents.add()
                                        agent_dispatch.agent_name = PHYSICAL_AGENT_NAME

                                        # Create dispatch rule
                                        result = await lkapi.sip.create_dispatch_rule(
                                            api.CreateSIPDispatchRuleRequest(
                                                rule=api.SIPDispatchRule(
                                                    dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                                                        room_prefix=f'sip-{phone_digits}__'
                                                    )
                                                ),
                                                trunk_ids=[phone.livekit_inbound_trunk_id],
                                                room_config=room_config
                                            )
                                        )
                                        return result.sip_dispatch_rule_id
                                    finally:
                                        await lkapi.aclose()

                                # Run async function in new event loop (Flask-compatible)
                                loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(loop)
                                try:
                                    dispatch_rule_id = loop.run_until_complete(create_dispatch_rule_async())
                                finally:
                                    loop.close()
                                    asyncio.set_event_loop(None)

                                with open('/tmp/agent_debug.log', 'a') as f:
                                    ts = datetime.now().isoformat()
                                    f.write(f"{ts} - asyncio.run() completed, rule_id={dispatch_rule_id}\n")

                                # Update phone mapping with dispatch rule ID
                                phone_mapping.sipConfigId = dispatch_rule_id

                                print(f"✅ Created dispatch rule {dispatch_rule_id} for {phone.phone_number} → {PHYSICAL_AGENT_NAME}")

                                with open('/tmp/agent_debug.log', 'a') as f:
                                    ts = datetime.now().isoformat()
                                    f.write(f"{ts} - SUCCESS: Created dispatch rule {dispatch_rule_id}\n")

                            except Exception as dispatch_error:
                                with open('/tmp/agent_debug.log', 'a') as f:
                                    import traceback
                                    ts = datetime.now().isoformat()
                                    f.write(f"{ts} - EXCEPTION in dispatch rule creation: {str(dispatch_error)}\n")
                                    f.write(f"{ts} - Traceback:\n{traceback.format_exc()}\n")
                                print(f"⚠️  Failed to create dispatch rule for {phone.phone_number}: {dispatch_error}")
                                import traceback
                                traceback.print_exc()
                                # Don't fail agent creation if dispatch rule fails
                        else:
                            print(f"⚠️  No trunk ID for {phone.phone_number} - skipping dispatch rule")
                    else:
                        print(f"⚠️  Phone number {phone_id} not found or doesn't belong to user")

                db.commit()
            except Exception as e:
                import traceback
                with open('/tmp/agent_debug.log', 'a') as f:
                    ts = datetime.now().isoformat()
                    f.write(f"{ts} - EXCEPTION in phone assignment: {str(e)}\n")
                    f.write(f"{ts} - Traceback:\n{traceback.format_exc()}\n")
                print(f"⚠️  Failed to assign phone numbers: {e}")
                # Don't fail the whole request if phone assignment fails

        # Fetch fresh agent data to get assigned phone numbers
        db_fresh = SessionLocal()
        try:
            agent_fresh = db_fresh.query(AgentConfig).filter(AgentConfig.id == agent_id).first()

            # Get assigned phone numbers from phone_mappings
            phone_mappings = db_fresh.query(PhoneMapping).filter(
                PhoneMapping.agentConfigId == agent_id,
                PhoneMapping.isActive == True
            ).all()

            assigned_numbers = [mapping.phoneNumber for mapping in phone_mappings]

            # Also check phone_number_pool for assigned phone numbers
            phone_pool_numbers = db_fresh.query(PhoneNumberPool).filter(
                PhoneNumberPool.assigned_to_agent_id == agent_id
            ).all()

            # Add phone numbers from pool (avoid duplicates)
            for phone in phone_pool_numbers:
                if phone.phone_number and phone.phone_number not in assigned_numbers:
                    assigned_numbers.append(phone.phone_number)

            # Build response with full agent data
            agent_response = {
                'id': agent_fresh.id,
                'name': agent_fresh.name,
                'instructions': agent_fresh.instructions,
                'did_number': agent_fresh.did_number or (assigned_numbers[0] if assigned_numbers else None),
                'assigned_phone_numbers': assigned_numbers,
                'sip_username': agent_fresh.sip_username,
                'sip_domain': agent_fresh.sip_domain,
                'created_at': agent_fresh.createdAt.isoformat() if agent_fresh.createdAt else None,
                'llm_model': agent_fresh.llmModel,
                'voice': agent_fresh.voice,
                'agent_mode': agent_fresh.agentMode,
            }

            db_fresh.close()
        except Exception as e:
            print(f"⚠️  Failed to fetch fresh agent data: {e}")
            db_fresh.close()
            # Fallback response
            agent_response = {
                'id': agent_id,
                'name': data.get('name', 'New Agent'),
                'did_number': None,
                'assigned_phone_numbers': []
            }

        # Handle tools configuration from Step 5
        tools_config = data.get('tools_config', {})
        if tools_config:
            from backend.agent_tools.models import AgentTool
            import json

            # Tool name mappings
            tool_names = {
                'knowledge_base': 'Knowledge Base',
                'calendar': 'Calendar Booking',
                'email': 'Email Follow-up',
                'web_search': 'Web Search',
                'handoff': 'Human Handoff',
                'sms': 'SMS Follow-up',
                'webhooks': 'Custom Webhooks'
            }

            for tool_type, tool_config in tools_config.items():
                if isinstance(tool_config, dict) and tool_config.get('enabled', False):
                    # Create agent_tools entry for enabled tools
                    tool = AgentTool(
                        id=str(uuid.uuid4()),
                        agentconfigid=agent_id,
                        userid=user_id,
                        tooltype=tool_type,
                        toolname=tool_names.get(tool_type, tool_type),
                        isenabled=True,
                        config=json.dumps(tool_config)
                    )
                    db.add(tool)

            try:
                db.commit()
                print(f"✅ Created {len([t for t in tools_config.values() if isinstance(t, dict) and t.get('enabled')])} tool configurations")
            except Exception as e:
                print(f"⚠️ Failed to save tool configurations: {e}")
                # Don't fail the whole request

        db.close()

        return jsonify({'success': True, 'data': agent_response})
    
    except Exception as e:
        import traceback
        print(f"Error creating agent: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    db.close()

    # Auto-restart if agent was deployed
    if was_deployed and agent_dir:
        print(f"🔄 Agent '{agent_name}' was deployed - triggering auto-restart...")
        
        # Use threading to restart in background
        import threading
        
        def restart_agent():
            import time
            import subprocess
            import shutil
            
            try:
                # Step 1: Stop the agent
                print(f"  1/3 Stopping {agent_name}...")
                subprocess.run(
                    ['pkill', '-9', '-f', f'{agent_dir}/main.py'],
                    capture_output=True
                )
                time.sleep(2)
                
                # Step 2: Copy fresh .env
                print(f"  2/3 Updating environment...")
                shutil.copy('/opt/livekit1/.env', f'{agent_dir}/.env')
                
                # Step 3: Start the agent
                print(f"  3/3 Starting {agent_name} with new config...")
                log_file = f'{agent_dir}/agent.log'
                with open(log_file, 'a') as log:
                    subprocess.Popen(
                        ['python3', 'main.py', 'start'],
                        cwd=agent_dir,
                        stdout=log,
                        stderr=subprocess.STDOUT,
                        start_new_session=True
                    )
                
                time.sleep(5)
                
                # Update status back to deployed
                from database import AgentConfig, SessionLocal as DbSession
                db_session = DbSession()
                try:
                    agent_record = db_session.query(AgentConfig).filter(
                        AgentConfig.filePath == agent_dir
                    ).first()
                    if agent_record:
                        agent_record.status = 'deployed'
                        db_session.commit()
                        print(f"✅ Auto-restart complete for {agent_name}, status set to 'deployed'")
                except:
                    pass
                finally:
                    db_session.close()
                
            except Exception as e:
                print(f"❌ Auto-restart failed for {agent_name}: {e}")
                # Reset status to created on failure
                from database import AgentConfig, SessionLocal as DbSession
                db_session = DbSession()
                try:
                    agent_record = db_session.query(AgentConfig).filter(
                        AgentConfig.filePath == agent_dir
                    ).first()
                    if agent_record:
                        agent_record.status = 'created'
                        db_session.commit()
                except:
                    pass
                finally:
                    db_session.close()
        
        # Start restart in background thread
        thread = threading.Thread(target=restart_agent, daemon=True)
        thread.start()
        
        return jsonify({
            'success': True,
            'restarted': True,
            'status': 'updating',
            'message': f'Agent configuration saved. Restarting with new settings (5-10 seconds)...'
        })
    
    return jsonify({
        'success': True,
        'restarted': False,
        'status': agent.status,
        'message': 'Agent configuration saved successfully'
    })

@app.route('/api/user/agents/<agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    """Delete agent configuration."""
    logger.debug(f"🔍 DELETE /api/user/agents/{agent_id} called")
    user_id = get_current_user_id()
    logger.debug(f"🔍 get_current_user_id() returned: {user_id}")
    if not user_id:
        logger.warning(f"⚠️  DELETE failed: No user found for agent {agent_id}")
        return jsonify({'success': False, 'error': {'message': 'No user found', 'code': 'UNAUTHORIZED'}}), 404

    db = SessionLocal()

    agent = db.query(AgentConfig).filter(
        AgentConfig.id == agent_id,
        AgentConfig.userId == user_id
    ).first()

    if not agent:
        db.close()
        return jsonify({'success': False, 'error': {'message': 'Agent not found', 'code': 'NOT_FOUND'}}), 404

    # Step 1: Unassign phone numbers and return them to inventory
    try:
        from phone_number_manager import PhoneNumberPool

        # Find all phone numbers assigned to this agent
        phone_mappings = db.query(PhoneMapping).filter(
            PhoneMapping.agentConfigId == agent_id,
            PhoneMapping.isActive == True
        ).all()

        if phone_mappings:
            print(f"📞 Unassigning {len(phone_mappings)} phone number(s) from agent {agent.name}")

            for mapping in phone_mappings:
                # Mark mapping as inactive
                mapping.isActive = False

                # Return phone to inventory (unassigned status)
                phone = db.query(PhoneNumberPool).filter(
                    PhoneNumberPool.phone_number == mapping.phoneNumber
                ).first()

                if phone:
                    phone.assigned_to_agent_id = None
                    phone.status = 'available'  # Return to inventory
                    phone.assigned_at = None

                    # Clear Magnus DID destination (unset routing)
                    if phone.magnus_did_id:
                        try:
                            from magnus_billing_client_new import MagnusBillingClientNew
                            import os

                            magnus_client = MagnusBillingClientNew(
                                api_key=os.getenv('MAGNUS_API_KEY'),
                                secret_key=os.getenv('MAGNUS_SECRET_KEY'),
                                base_url=os.getenv('MAGNUS_BILLING_URL', 'https://voice.epic.dm/mbilling')
                            )

                            # Clear DID destination in Magnus (unset routing)
                            magnus_client.clear_did_destination(
                                did_number=phone.phone_number.replace('+', '')
                            )
                            print(f"   ✅ Cleared Magnus DID destination for {phone.phone_number}")
                        except Exception as did_error:
                            print(f"   ⚠️  Failed to clear Magnus DID destination: {did_error}")

                    print(f"   ✅ Returned {phone.phone_number} to inventory (available)")

            db.commit()
            print(f"✅ All phone numbers returned to customer inventory")
        else:
            print(f"📞 No phone numbers assigned to agent {agent.name}")

    except Exception as e:
        print(f"⚠️  Error unassigning phone numbers: {e}")
        import traceback
        traceback.print_exc()

    # Step 2: Deprovision Magnus Billing SIP account (optional - keep for billing history)
    # NOTE: We're NOT deleting the SIP account, just unassigning it
    # The SIP account remains in Magnus for billing/audit purposes
    try:
        from backend.agent_provisioning_hooks import on_agent_deleted

        if agent.fusionpbx_agent_uuid:
            deprovision_result = on_agent_deleted(
                agent_config_id=agent.id,
                fusionpbx_agent_uuid=agent.fusionpbx_agent_uuid
            )
            if deprovision_result['success']:
                print(f"✅ Magnus Billing: Agent {agent.name} deprovisioned")
                print(f"   Extension: {agent.sip_extension}")
                print(f"   DID: {agent.did_number}")
            else:
                print(f"⚠️  Magnus Billing deprovisioning failed: {deprovision_result.get('error')}")
        else:
            print(f"⚠️  No Magnus UUID for agent {agent.name} - skipping deprovisioning")

    except Exception as e:
        print(f"⚠️  Error during Magnus Billing deprovisioning: {e}")
        import traceback
        traceback.print_exc()

    # Step 3: Mark agent as inactive (soft delete)
    agent.isActive = False
    db.commit()
    db.close()

    return jsonify({'success': True, 'data': {'id': agent_id, 'message': 'Agent deleted successfully'}})

@app.route('/api/user/agents/<agent_id>/deploy', methods=['POST'])
def deploy_agent(agent_id):
    """Activate agent configuration (dynamic routing - no physical deployment needed)."""
    db = SessionLocal()

    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404

        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id
        ).first()

        if not agent:
            return jsonify({'error': 'Agent not found'}), 404

        # Get the tst0002 LiveKit agent (infrastructure agent)
        livekit_agent = db.query(LiveKitAgent).filter(
            LiveKitAgent.name == 'tst0002'
        ).first()

        if not livekit_agent:
            return jsonify({
                'success': False,
                'error': 'LiveKit infrastructure agent (tst0002) not found',
                'message': 'Please ensure the LiveKit agent is running'
            }), 500

        # Start the agent process
        agent_dir = get_agent_directory(agent_id, agent.name)
        start_result = start_agent_process(agent_id, agent.name, agent_dir)

        if not start_result.get('success'):
            # Failed to start process
            return jsonify({
                'success': False,
                'error': start_result.get('message'),
                'message': f'Failed to start agent process: {start_result.get("message")}'
            }), 500

        # Activate the agent config and store PID
        agent.isActive = True
        agent.status = 'deployed'
        agent.livekitAgentId = livekit_agent.id
        agent.process_pid = start_result.get('pid')  # Track which process this agent is using

        db.commit()

        print(f"✅ Activated agent config: {agent.name} (ID: {agent.id})")
        print(f"   Started agent process (PID: {start_result.get('pid')})")
        print(f"   Linked to LiveKit agent: tst0002")
        print(f"   Agent will handle calls via dynamic routing")

        return jsonify({
            'success': True,
            'agent_id': agent_id,
            'status': 'deployed',
            'livekit_agent': 'tst0002',
            'pid': start_result.get('pid'),
            'message': f'Agent {agent.name} started successfully'
        })
        
    except Exception as e:
        import traceback
        print(f"❌ Deployment failed: {e}")
        print(traceback.format_exc())
        
        # Reset agent status
        try:
            agent = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()
            if agent:
                agent.status = 'created'
                db.commit()
        except:
            pass
        
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Deployment failed. Check server logs for details.'
        }), 500
    finally:
        db.close()

@app.route('/api/user/agents/<agent_id>/undeploy', methods=['POST'])
def undeploy_agent(agent_id):
    """Remove agent from LiveKit Cloud and stop the local process."""
    db = SessionLocal()
    
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404
        
        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id
        ).first()

        if not agent:
            return jsonify({'error': 'Agent not found'}), 404
        
        # Check if agent is actually deployed or in a stuck state
        if agent.status not in ['deployed', 'undeploying', 'deploying']:
            return jsonify({
                'success': True,
                'message': f'Agent was not deployed (status: {agent.status})',
                'status': agent.status
            })
        
        # Store values before modifying
        agent_name = agent.name
        agent_dir = agent.filePath
        agent_pid = agent.process_pid

        # Update status to undeploying
        agent.status = 'undeploying'
        agent.process_pid = None  # Clear this agent's PID tracking
        db.commit()

        # Check if other agents are sharing this process
        if agent_pid:
            other_agents_with_pid = db.query(AgentConfig).filter(
                AgentConfig.process_pid == agent_pid,
                AgentConfig.id != agent_id
            ).count()

            if other_agents_with_pid > 0:
                # Other agents are using this process, don't kill it
                print(f"✅ Deactivated agent {agent_name}")
                print(f"   Process (PID {agent_pid}) still running for {other_agents_with_pid} other agent(s)")

                agent.status = 'created'
                db.commit()

                return jsonify({
                    'success': True,
                    'agent_id': agent_id,
                    'status': 'created',
                    'message': f'Agent deactivated (process shared with {other_agents_with_pid} other agent(s))',
                })
            else:
                # This is the last agent using this process, kill it
                stop_result = stop_agent_process(agent_id, agent_name, agent_dir)

                if not stop_result.get('success'):
                    print(f"⚠️ Error stopping agent: {stop_result.get('message')}")
                else:
                    print(f"✅ {stop_result.get('message')}")

                agent.status = 'created'
                db.commit()

                print(f"✅ Undeployed agent {agent_name} (last agent using process)")

                return jsonify({
                    'success': True,
                    'agent_id': agent_id,
                    'status': 'created',
                    'message': stop_result.get('message', 'Agent stopped successfully'),
                })
        else:
            # Agent had no PID tracked, just mark as inactive
            agent.status = 'created'
            db.commit()

            return jsonify({
                'success': True,
                'agent_id': agent_id,
                'status': 'created',
                'message': 'Agent deactivated',
            })
        
    except Exception as e:
        import traceback
        print(f"❌ Undeployment failed: {e}")
        print(traceback.format_exc())
        
        # Reset status if something went wrong
        try:
            agent.status = 'created'
            db.commit()
            print(f"⚠️ Reset agent status to 'created' after error")
        except:
            pass
            
        return jsonify({'error': str(e)}), 500
    
    finally:
        db.close()

@app.route('/api/user/agents/<agent_id>/livekit-info', methods=['GET'])
def get_agent_livekit_info(agent_id):
    """
    Get LiveKit information for an agent configuration.

    NEW ARCHITECTURE:
    - Single tst0002 agent handles all calls
    - Agent configs are database entries loaded dynamically
    - Routing based on phone number → agent_config_id
    """
    db = SessionLocal()

    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404

        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id
        ).first()

        if not agent:
            return jsonify({'error': 'Agent not found'}), 404

        # Only return info for deployed agents
        if agent.status != 'deployed':
            return jsonify({'error': 'Agent is not deployed'}), 400

        import os
        from datetime import datetime

        # NEW ARCHITECTURE: Return configuration info instead of worker info
        info = {
            'configId': str(agent.id),
            'architecture': 'dynamic',
            'workerName': 'tst0002 (Shared Agent)',
            'status': 'Active Configuration',
            'loadingMethod': 'Database-Driven Routing',
            'url': os.getenv('LIVEKIT_URL', 'wss://ai-agent-d161ds18.livekit.cloud'),
            'protocol': 16,
            'lastUpdated': agent.updatedAt.isoformat() if agent.updatedAt else None,
            'description': f'Config loaded dynamically by tst0002 agent based on phone number routing'
        }

        # Check if tst0002 agent is running by looking for its log
        tst0002_log = '/opt/livekit1/agents/tst0002/agent.log'
        if os.path.exists(tst0002_log):
            try:
                with open(tst0002_log, 'r') as f:
                    lines = f.readlines()
                    last_lines = lines[-50:] if len(lines) > 50 else lines

                # Get tst0002 agent uptime
                for line in last_lines[:20]:
                    import re
                    timestamp_match = re.search(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})', line)
                    if timestamp_match:
                        try:
                            start_time = datetime.strptime(timestamp_match.group(1), '%Y-%m-%d %H:%M:%S')
                            uptime_seconds = (datetime.now() - start_time).total_seconds()

                            # Format uptime
                            if uptime_seconds < 60:
                                uptime_str = f"{int(uptime_seconds)}s"
                            elif uptime_seconds < 3600:
                                uptime_str = f"{int(uptime_seconds / 60)}m"
                            elif uptime_seconds < 86400:
                                hours = int(uptime_seconds / 3600)
                                minutes = int((uptime_seconds % 3600) / 60)
                                uptime_str = f"{hours}h {minutes}m"
                            else:
                                days = int(uptime_seconds / 86400)
                                hours = int((uptime_seconds % 86400) / 3600)
                                uptime_str = f"{days}d {hours}h"

                            info['workerUptime'] = uptime_str
                            break
                        except:
                            pass
            except Exception as e:
                print(f"Error reading tst0002 log: {e}")

        return jsonify(info)
        
    except Exception as e:
        import traceback
        print(f"❌ Failed to get LiveKit info: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/user/phone-mappings-legacy')
def get_phone_numbers():
    """Get phone numbers for current user (LEGACY - use /api/user/phone-numbers instead)."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify([])

    db = SessionLocal()

    mappings = db.query(PhoneMapping).filter(
        PhoneMapping.userId == user_id,
        PhoneMapping.isActive == True
    ).all()
    
    result = []
    for mapping in mappings:
        result.append({
            'id': mapping.id,
            'phone_number': mapping.phoneNumber,
            'sip_trunk_id': mapping.sipTrunkId,
            'agent_id': mapping.agentConfigId,
            'agent_name': mapping.agent.name if mapping.agent else None
        })
    
    db.close()
    return jsonify(result)

@app.route('/api/user/phone-numbers', methods=['POST'])
def assign_phone_number():
    """Assign phone number to agent."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    data = request.json
    db = SessionLocal()
    
    try:
        # Check if phone number already exists
        existing = db.query(PhoneMapping).filter(
            PhoneMapping.phoneNumber == data['phone_number']
        ).first()
        
        if existing:
            return jsonify({'error': 'Phone number already assigned'}), 400
        
        # Get SIP configuration if provided
        sip_config_id = data.get('sip_config_id')
        sip_trunk_id = data.get('sip_trunk_id', '')
        
        # If no SIP config specified but trunk ID provided, try to find matching config
        if not sip_config_id and sip_trunk_id:
            sip_config = db.query(SIPConfig).filter(
                SIPConfig.userId == user_id,
                SIPConfig.trunkId == sip_trunk_id
            ).first()
            if sip_config:
                sip_config_id = sip_config.id
        
        # If still no SIP config, use default
        if not sip_config_id:
            default_config = db.query(SIPConfig).filter(
                SIPConfig.userId == user_id,
                SIPConfig.isDefault == True
            ).first()
            if default_config:
                sip_config_id = default_config.id
                sip_trunk_id = default_config.trunk_id
        
        mapping = PhoneMapping(
            id=str(uuid.uuid4()),
            user_id=user_id,
            agent_config_id=data['agent_id'],
            phone_number=data['phone_number'],
            sip_trunk_id=sip_trunk_id,
            sip_config_id=sip_config_id
        )
        
        db.add(mapping)
        db.commit()
        
        return jsonify({
            'success': True,
            'id': mapping.id,
            'phone_number': mapping.phoneNumber,
            'sip_config_id': mapping.sipConfigId,
            'sip_trunk_id': mapping.sipTrunkId
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/api/user/call-logs')
def get_call_logs():
    """Get call history for current user with pagination."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            'success': True,
            'data': {
                'calls': [],
                'pagination': {
                    'page': 1,
                    'limit': 20,
                    'total': 0,
                    'total_pages': 0
                }
            }
        })

    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)

    # Ensure valid pagination
    page = max(1, page)
    limit = min(max(1, limit), 100)  # Max 100 per page

    db = SessionLocal()

    # Base query
    query = db.query(CallLog).filter(CallLog.userId == user_id)

    # Apply filters if provided
    if request.args.get('agent_id'):
        query = query.filter(CallLog.agentConfigId == request.args.get('agent_id'))
    if request.args.get('status'):
        query = query.filter(CallLog.status == request.args.get('status'))
    if request.args.get('start_date'):
        query = query.filter(CallLog.startedAt >= request.args.get('start_date'))
    if request.args.get('end_date'):
        query = query.filter(CallLog.startedAt <= request.args.get('end_date'))

    # Get total count
    total = query.count()
    total_pages = (total + limit - 1) // limit  # Ceiling division

    # Apply pagination and ordering
    logs = query.order_by(CallLog.startedAt.desc()).offset((page - 1) * limit).limit(limit).all()

    # Helper function to map database status to frontend CallStatus enum
    def map_call_status(log):
        """Map database status to frontend enum values."""
        # If call has ended with a duration, it's completed
        if log.endedAt and log.durationSeconds and log.durationSeconds > 0:
            return 'completed'
        # If call has started but not ended (and no duration), it's in progress
        elif log.startedAt and (not log.endedAt or not log.durationSeconds):
            return 'in_progress'
        # Default fallback for completed calls
        else:
            return 'completed'

    result = []
    for log in logs:
        result.append({
            'id': log.id,
            'phone_number': log.phoneNumber,
            'agent_name': log.agent.name if log.agent else 'Unknown',
            'duration_seconds': log.durationSeconds,
            'cost': log.cost,
            'cost_usd': log.cost,  # Add cost_usd for frontend compatibility
            'status': map_call_status(log),
            'started_at': log.startedAt.isoformat() if log.startedAt else None,
            'ended_at': log.endedAt.isoformat() if log.endedAt else None
        })

    db.close()

    return jsonify({
        'success': True,
        'data': {
            'calls': result,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'total_pages': total_pages
            }
        }
    })

@app.route('/api/v1/calls/<call_id>')
def get_call_detail(call_id):
    """Get call details by ID with outcome data."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    db = SessionLocal()

    try:
        # Get call log
        call_log = db.query(CallLog).filter(
            CallLog.id == call_id,
            CallLog.userId == user_id
        ).first()

        if not call_log:
            return jsonify({'error': 'Call not found'}), 404

        # Map status
        if call_log.endedAt and call_log.durationSeconds and call_log.durationSeconds > 0:
            status = 'completed'
        elif call_log.startedAt and (not call_log.endedAt or not call_log.durationSeconds):
            status = 'in_progress'
        else:
            status = 'completed'

        # Extract phone number from room name if not set
        # Room format: sip-{DID}___{caller}_{random} or sip-call__{caller}_{random}
        phone_number = call_log.phoneNumber
        caller_number = None

        if not phone_number and call_log.livekitRoomName:
            import re
            room = call_log.livekitRoomName

            # Pattern 1: sip-{DID}___{caller}_{random} (3 underscores)
            match = re.match(r'sip-(\d+)___(\d+)_', room)
            if match:
                phone_number = '+' + match.group(1)  # DID (called number)
                caller_number = '+' + match.group(2)  # Caller
            else:
                # Pattern 2: sip-call__{caller}_{random} (2 underscores)
                match = re.match(r'sip-call__(\d+)_', room)
                if match:
                    caller_number = '+' + match.group(1)

        # Build call object
        call_data = {
            'id': call_log.id,
            'phone_number': phone_number,
            'caller_number': caller_number,
            'agent_name': call_log.agent.name if call_log.agent else 'Unknown',
            'agent_id': call_log.agentConfigId,
            'duration_seconds': call_log.durationSeconds,
            'cost': call_log.cost,
            'cost_usd': call_log.cost,
            'status': status,
            'started_at': call_log.startedAt.isoformat() if call_log.startedAt else None,
            'ended_at': call_log.endedAt.isoformat() if call_log.endedAt else None,
            'room_name': call_log.roomName or call_log.livekitRoomName
        }

        # Outcome data (not implemented yet, return None)
        outcome_data = None

        return jsonify({
            'success': True,
            'data': {
                'call': call_data,
                'outcome': outcome_data
            }
        })

    finally:
        db.close()

@app.route('/api/user/stats')
def get_stats():
    """Get usage statistics for dashboard."""
    from datetime import datetime, timedelta

    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            'total_agents': 0,
            'total_phone_numbers': 0,
            'total_calls_today': 0,
            'total_calls_month': 0,
            'total_cost_today_usd': 0.0,
            'total_cost_month_usd': 0.0,
            'active_calls': 0
        })

    db = SessionLocal()

    # Total agents
    agent_count = db.query(AgentConfig).filter(
        AgentConfig.userId == user_id,
        AgentConfig.isActive == True
    ).count()

    # Phone numbers
    phone_count = db.query(PhoneMapping).filter(
        PhoneMapping.userId == user_id,
        PhoneMapping.isActive == True
    ).count()

    # Date ranges
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Calls today
    calls_today = db.query(CallLog).filter(
        CallLog.userId == user_id,
        CallLog.startedAt >= today_start
    ).count()

    # Calls this month
    calls_month = db.query(CallLog).filter(
        CallLog.userId == user_id,
        CallLog.startedAt >= month_start
    ).count()

    # Cost today
    cost_today_result = db.query(
        func.sum(cast(func.nullif(CallLog.cost, ''), Float))
    ).filter(
        CallLog.userId == user_id,
        CallLog.startedAt >= today_start
    ).scalar()
    cost_today = float(cost_today_result or 0)

    # Cost this month
    cost_month_result = db.query(
        func.sum(cast(func.nullif(CallLog.cost, ''), Float))
    ).filter(
        CallLog.userId == user_id,
        CallLog.startedAt >= month_start
    ).scalar()
    cost_month = float(cost_month_result or 0)

    # Active calls (in_progress status)
    active_calls = db.query(CallLog).filter(
        CallLog.userId == user_id,
        CallLog.status == 'in_progress'
    ).count()

    db.close()

    return jsonify({
        'success': True,
        'data': {
            'total_agents': agent_count,
            'total_phone_numbers': phone_count,
            'total_calls_today': calls_today,
            'total_calls_month': calls_month,
            'total_cost_today_usd': round(cost_today, 2),
            'total_cost_month_usd': round(cost_month, 2),
            'active_calls': active_calls
        }
    })

@app.route('/api/user/stats/calls', methods=['GET'])
def get_calls_analytics():
    """Get calls analytics with period filter."""
    from datetime import datetime, timedelta

    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            'success': True,
            'data': {
                'period': request.args.get('period', '7d'),
                'data': [],
                'total': 0,
                'by_agent': []
            }
        })

    period = request.args.get('period', '7d')

    # Calculate date range
    if period == '24h':
        start_date = datetime.now() - timedelta(hours=24)
    elif period == '7d':
        start_date = datetime.now() - timedelta(days=7)
    elif period == '30d':
        start_date = datetime.now() - timedelta(days=30)
    elif period == '90d':
        start_date = datetime.now() - timedelta(days=90)
    else:
        start_date = datetime.now() - timedelta(days=7)

    db = SessionLocal()

    # Get calls by day
    calls = db.query(CallLog).filter(
        CallLog.userId == user_id,
        CallLog.startedAt >= start_date
    ).all()

    # Group by date
    calls_by_day = {}
    for call in calls:
        date_str = call.startedAt.date().isoformat()
        if date_str not in calls_by_day:
            calls_by_day[date_str] = 0
        calls_by_day[date_str] += 1

    # Get calls by agent
    agent_calls = {}
    for call in calls:
        agent = db.query(AgentConfig).filter(AgentConfig.id == call.agentConfigId).first()
        agent_name = agent.name if agent else 'Unknown'
        agent_id = str(call.agentConfigId) if call.agentConfigId else 'unknown'

        if agent_id not in agent_calls:
            agent_calls[agent_id] = {'agent_id': agent_id, 'agent_name': agent_name, 'count': 0}
        agent_calls[agent_id]['count'] += 1

    db.close()

    return jsonify({
        'success': True,
        'data': {
            'period': period,
            'data': [{'date': k, 'count': v} for k, v in sorted(calls_by_day.items())],
            'total': len(calls),
            'by_agent': list(agent_calls.values())
        }
    })

@app.route('/api/user/stats/cost', methods=['GET'])
def get_cost_analytics():
    """Get cost analytics with period filter."""
    from datetime import datetime, timedelta

    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            'success': True,
            'data': {
                'period': request.args.get('period', '7d'),
                'total_cost': 0.0,
                'breakdown': {
                    'llm_cost': 0.0,
                    'stt_cost': 0.0,
                    'tts_cost': 0.0
                },
                'by_day': []
            }
        })

    period = request.args.get('period', '7d')

    # Calculate date range
    if period == '24h':
        start_date = datetime.now() - timedelta(hours=24)
    elif period == '7d':
        start_date = datetime.now() - timedelta(days=7)
    elif period == '30d':
        start_date = datetime.now() - timedelta(days=30)
    elif period == '90d':
        start_date = datetime.now() - timedelta(days=90)
    else:
        start_date = datetime.now() - timedelta(days=7)

    db = SessionLocal()

    # Get calls with costs
    calls = db.query(CallLog).filter(
        CallLog.userId == user_id,
        CallLog.startedAt >= start_date
    ).all()

    # Calculate totals
    total_cost = sum(float(call.cost or 0) for call in calls)

    # Group by date
    cost_by_day = {}
    for call in calls:
        date_str = call.startedAt.date().isoformat()
        if date_str not in cost_by_day:
            cost_by_day[date_str] = 0.0
        cost_by_day[date_str] += float(call.cost or 0)

    db.close()

    # For now, return breakdown as equal thirds (TODO: implement actual breakdown tracking)
    breakdown_third = total_cost / 3 if total_cost > 0 else 0

    return jsonify({
        'success': True,
        'data': {
            'period': period,
            'total_cost': round(total_cost, 2),
            'breakdown': {
                'llm_cost': round(breakdown_third, 2),
                'stt_cost': round(breakdown_third, 2),
                'tts_cost': round(breakdown_third, 2)
            },
            'by_day': [{'date': k, 'cost': round(v, 2)} for k, v in sorted(cost_by_day.items())]
        }
    })

@app.route('/api/livekit/token', methods=['POST'])
def get_livekit_token():
    """Generate LiveKit access token for voice chat."""
    data = request.json or {}
    room_name = data.get('room_name', 'voice-chat')
    participant_name = data.get('participant_name', 'user')

    # Get LiveKit credentials from environment
    livekit_url = os.getenv('LIVEKIT_URL', 'ws://localhost:7880')
    livekit_api_key = os.getenv('LIVEKIT_API_KEY')
    livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

    if not livekit_api_key or not livekit_api_secret:
        return jsonify({
            'error': 'LiveKit credentials not configured',
            'message': 'Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env'
        }), 500

    try:
        # Create access token
        token = api.AccessToken(livekit_api_key, livekit_api_secret)
        token.with_identity(participant_name)
        token.with_name(participant_name)
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True
        ))

        jwt_token = token.to_jwt()

        return jsonify({
            'token': jwt_token,
            'url': livekit_url,
            'room': room_name
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to generate token',
            'message': str(e)
        }), 500

@app.route('/api/sip/trunks', methods=['GET'])
def get_sip_trunks():
    """Get all SIP trunks for current user."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify([])

    db = SessionLocal()

    # Get all phone mappings with SIP trunk info
    mappings = db.query(PhoneMapping).filter(
        PhoneMapping.userId == user_id,
        PhoneMapping.isActive == True
    ).all()

    # Group by SIP trunk
    trunks = {}
    for mapping in mappings:
        trunk_id = mapping.sipTrunkId or 'default'
        if trunk_id not in trunks:
            trunks[trunk_id] = {
                'id': trunk_id,
                'name': f'SIP Trunk {trunk_id}',
                'phone_numbers': [],
                'status': 'active'
            }
        trunks[trunk_id]['phone_numbers'].append({
            'id': mapping.id,
            'number': mapping.phoneNumber,
            'agent_name': mapping.agent.name if mapping.agent else None
        })

    db.close()
    return jsonify(list(trunks.values()))

@app.route('/api/sip/test-call', methods=['POST'])
def test_sip_call():
    """Simulate a test SIP call for a phone number."""
    data = request.json
    phone_number = data.get('phone_number')

    if not phone_number:
        return jsonify({'error': 'Phone number required'}), 400

    db = SessionLocal()

    # Check if phone number is mapped
    mapping = db.query(PhoneMapping).filter(
        PhoneMapping.phoneNumber == phone_number,
        PhoneMapping.isActive == True
    ).first()

    if not mapping:
        db.close()
        return jsonify({
            'success': False,
            'message': 'Phone number not found or not active'
        }), 404

    agent = mapping.agent
    if not agent:
        db.close()
        return jsonify({
            'success': False,
            'message': 'No agent assigned to this phone number'
        }), 404

    # Return configuration that would be used for this call
    result = {
        'success': True,
        'message': 'Configuration loaded successfully',
        'phone_number': phone_number,
        'agent': {
            'id': agent.id,
            'name': agent.name,
            'llm_model': agent.llmModel,
            'voice': agent.voice,
            'language': agent.language,
            'instructions': agent.instructions
        },
        'user': {
            'id': agent.user_id,
            'name': agent.user.name if agent.user else 'Unknown'
        },
        'sip_trunk_id': mapping.sipTrunkId
    }

    db.close()
    return jsonify(result)

@app.route('/api/phone-numbers/<phone_id>', methods=['DELETE'])
def delete_phone_number(phone_id):
    """Delete/deactivate a phone number mapping."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    db = SessionLocal()

    mapping = db.query(PhoneMapping).filter(
        PhoneMapping.id == phone_id,
        PhoneMapping.userId == user_id
    ).first()

    if not mapping:
        db.close()
        return jsonify({'error': 'Phone number not found'}), 404

    mapping.isActive = False
    db.commit()
    db.close()

    return jsonify({'success': True})

@app.route('/api/sip/outbound-call', methods=['POST'])
def create_outbound_call():
    """Initiate an outbound call from an agent to a phone number."""
    db = SessionLocal()
    
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404

        data = request.json
        agent_id = data.get('agent_id')
        to_number = data.get('to_number')
        from_number = data.get('from_number')  # Optional caller ID

        if not agent_id or not to_number:
            return jsonify({'error': 'agent_id and to_number are required'}), 400

        # Get agent configuration
        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id,
            AgentConfig.isActive == True
        ).first()

        if not agent:
            return jsonify({'error': 'Agent not found'}), 404
            
        # Store agent properties in local variables to avoid session issues
        agent_name = agent.name
        agent_voice = agent.voice or 'alloy'
        agent_model = agent.llmModel or 'gpt-4o-mini'

        # Get LiveKit credentials
        livekit_url = os.getenv('LIVEKIT_URL')
        livekit_api_key = os.getenv('LIVEKIT_API_KEY')
        livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

        if not livekit_api_key or not livekit_api_secret:
            return jsonify({'error': 'LiveKit credentials not configured'}), 500

        # Create a unique room name for this call
        room_name = f"outbound-call-{uuid.uuid4()}"

        # Get SIP configuration - first try any config specified in request
        sip_config_id = data.get('sip_config_id')
        sip_config = None
        
        if sip_config_id:
            sip_config = db.query(SIPConfig).filter(
                SIPConfig.id == sip_config_id,
                SIPConfig.userId == user_id,
                SIPConfig.outboundEnabled == True
            ).first()
        
        # If no config specified or not found, try to find a default config
        if not sip_config:
            sip_config = db.query(SIPConfig).filter(
                SIPConfig.userId == user_id,
                SIPConfig.isDefault == True,
                SIPConfig.outboundEnabled == True
            ).first()
            
        # If still no config, use environment variable
        if sip_config:
            sip_trunk_id = sip_config.trunk_id
            sip_domain = sip_config.sip_url
            sip_transport = sip_config.sip_transport
            print(f"✅ Using SIP config: {sip_config.name} ({sip_config.id})")
        else:
            # Fallback to environment variables
            sip_trunk_id = os.getenv('SIP_OUTBOUND_TRUNK_ID')
            sip_domain = os.getenv('EPIC_SIP_DOMAIN', 'voice.epic.dm')
            sip_transport = os.getenv('EPIC_SIP_TRANSPORT', 'tcp')
            print("⚠️ Using default SIP config from environment variables")
            
        if not sip_trunk_id:
            return jsonify({'error': 'No SIP trunk ID available - configure in Settings'}), 500
        
        # Ensure to_number has a plus sign
        if not to_number.startswith('+'):
            to_number = f"+{to_number}"
            
        # Set from_number if not provided
        if not from_number:
            from_number = "+17678183366"  # Default LiveKit number
        elif not from_number.startswith('+'):
            from_number = f"+{from_number}"
            
        # Create the room and make an actual SIP call using LiveKit API
        print(f"✅ Creating room: {room_name}")
        print(f"✅ Dispatching SIP call to {to_number} from {from_number} via trunk {sip_trunk_id}")
        
        # Use LiveKit REST API with requests
        import requests
        import jwt
        import time
        
        # Generate JWT token for LiveKit API
        def generate_access_token(api_key, api_secret, grant):
            at = jwt.encode(
                payload={
                    "exp": int(time.time()) + 86400,  # 24 hours
                    "iss": api_key,
                    "video": grant
                },
                key=api_secret,
                algorithm="HS256"
            )
            return at
        
        # Create room via API
        try:
            # Enable more verbose debugging in the requests library
            import logging
            import http.client as http_client
            http_client.HTTPConnection.debuglevel = 1
            logging.basicConfig()
            logging.getLogger().setLevel(logging.DEBUG)
            requests_log = logging.getLogger("requests.packages.urllib3")
            requests_log.setLevel(logging.DEBUG)
            requests_log.propagate = True
            
            # Create room via Room API
            room_token = generate_access_token(
                livekit_api_key,
                livekit_api_secret,
                {"roomCreate": True, "roomName": room_name}
            )
            
            api_url = livekit_url.replace('wss://', 'https://').replace('ws://', 'http://')
            if not api_url.endswith('/'):
                api_url += '/'
                
            print(f"\n============== LIVEKIT API DETAILS ================")
            print(f"API URL: {api_url}")
            print(f"API KEY: {livekit_api_key}")
            print(f"SIP TRUNK ID: {sip_trunk_id}")
            print(f"==================================================\n")
                
            # Per CLI test: Create room FIRST, then SIP participant
            print(f"✅ Step 1: Creating room {room_name}")
            room_token = generate_access_token(
                livekit_api_key, 
                livekit_api_secret,
                {"roomCreate": True}
            )
            
            room_url = f"{api_url}twirpc/livekit.RoomService/CreateRoom"
            room_data = {"name": room_name}
            room_headers = {"Authorization": f"Bearer {room_token}", "Content-Type": "application/json"}
            
            room_response = requests.post(room_url, json=room_data, headers=room_headers)
            if not room_response.ok:
                print(f"Failed to create room: {room_response.status_code} - {room_response.text}")
                return jsonify({'error': f'Failed to create room: {room_response.status_code}'}), 500
            
            print(f"✅ Room created successfully")
            
            # Step 2: Create SIP participant (like CLI does)
            print(f"✅ Step 2: Creating SIP participant")
            
            sip_token = generate_access_token(
                livekit_api_key, 
                livekit_api_secret,
                {"roomJoin": True, "roomName": room_name, "canPublish": True}
            )
            
            headers = {
                "Authorization": f"Bearer {sip_token}",
                "Content-Type": "application/json"
            }
            
            # Use CreateSIPParticipant endpoint instead of Dispatch (as per the docs)
            sip_url = f"{api_url}twirpc/livekit.SIPService/CreateSIPParticipant"
            
            # Create a unique participant ID
            participant_identity = f"agent-{agent_id}-{str(uuid.uuid4())[:8]}"
            participant_name = f"Agent {agent_name}"
            
            # SIP participant request data (matching CLI exactly)
            sip_data = {
                "sip_trunk_id": sip_trunk_id,
                "sip_call_to": to_number,
                "sip_number": from_number,
                "room_name": room_name,
                "participant_identity": participant_identity,
                "participant_name": participant_name
            }
            
            print(f"\nCreating SIP Participant using LiveKit SDK...")
            print(f"Calling: {to_number} from {from_number}")
            
            # Use LiveKit SDK instead of raw HTTP requests (handles protobuf encoding)
            import asyncio
            from livekit.protocol.sip import CreateSIPParticipantRequest
            
            async def create_sip_participant_async():
                lk_api = api.LiveKitAPI(
                    api_url.rstrip('/'),
                    livekit_api_key,
                    livekit_api_secret
                )
                try:
                    request = CreateSIPParticipantRequest(
                        sip_trunk_id=sip_trunk_id,
                        sip_call_to=to_number,
                        sip_number=from_number,
                        room_name=room_name,
                        participant_identity=participant_identity,
                        participant_name=participant_name
                    )
                    participant = await lk_api.sip.create_sip_participant(request)
                    return participant
                finally:
                    await lk_api.aclose()
            
            # Run async function
            try:
                participant = asyncio.run(create_sip_participant_async())
                print(f"✅ SIP Participant created successfully!")
                print(f"   SIP Call ID: {participant.sip_call_id}")
                print(f"   Participant ID: {participant.participant_id}")
                print(f"   Room: {participant.room_name}")
            except Exception as e:
                print(f"❌ Failed to create SIP participant: {e}")
                return jsonify({'error': f'Failed to create SIP participant: {str(e)}'}), 500
            
            print(f"✅ SIP call initiated - LiveKit will send INVITE to Asterisk")
            print(f"   Agent will auto-join when call connects (per LiveKit workflow)")
            
        except Exception as e:
            print(f"❌ Error making LiveKit API calls: {str(e)}")
            return jsonify({'error': f'Error with LiveKit API: {str(e)}'}), 500
        
        # Log the outbound call attempt
        call_id = str(uuid.uuid4())
        call_log = CallLog(
            id=call_id,
            user_id=user_id,
            agent_config_id=agent_id,
            phone_number=to_number,
            livekitRoomName=room_name,
            started_at=datetime.utcnow()
        )
        db.add(call_log)
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Outbound call initiated',
            'call_id': call_id,
            'room_name': room_name,
            'to_number': to_number,
            'from_number': from_number,
            'trunk_id': sip_trunk_id,
            'agent': {
                'id': agent_id,  # Use stored agent_id
                'name': agent_name,
                'voice': agent_voice,
                'model': agent_model
            },
            'instructions': """
The outbound call has been initiated!

✓ Room created: {room_name}
✓ Dialing: {to_number}
✓ From: {from_number}
✓ Trunk ID: {trunk_id}

The LiveKit SIP service is placing your call now. 
When the recipient answers, your agent will automatically join the call.

If needed, you can manually dispatch via the LiveKit CLI:

   lk sip create-dispatch \
     --to "{to_number}" \
     --from "{from_number}" \
     --room "{room_name}" \
     --trunk-id "{trunk_id}"
            """.format(
                to_number=to_number,
                from_number=from_number,
                room_name=room_name,
                trunk_id=sip_trunk_id
            )
        })
        
    except Exception as e:
        import traceback
        print(f"❌ Failed to create outbound call: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'error': 'Failed to create outbound call',
            'message': str(e)
        }), 500

# ============================================================================
# Phone Number Management Endpoints
# ============================================================================

phone_manager = PhoneNumberManager()

@app.route('/api/user/phone-numbers', methods=['GET'])
def get_user_phone_numbers():
    """Get all phone numbers owned by current user"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    db = SessionLocal()
    try:
        numbers = phone_manager.get_user_numbers(db, user_id)

        result = []
        for num in numbers:
            # Check phone_mappings for ACTIVE assignments (source of truth)
            phone_mapping = db.query(PhoneMapping).filter(
                PhoneMapping.phoneNumber == num.phone_number,
                PhoneMapping.isActive == True
            ).first()

            # Determine actual status from phone_mappings
            actual_status = 'available'
            agent_name = None
            agent_id = None
            assigned_at = None

            if phone_mapping:
                # Phone is actively assigned via phone_mappings
                actual_status = 'assigned'
                agent_id = phone_mapping.agentConfigId
                assigned_at = phone_mapping.createdAt

                # Get agent info (must be active and belong to user)
                agent = db.query(AgentConfig).filter(
                    AgentConfig.id == phone_mapping.agentConfigId,
                    AgentConfig.userId == user_id,
                    AgentConfig.isActive == True  # Only consider active agents
                ).first()
                if agent:
                    agent_name = agent.name
                else:
                    # Orphaned assignment (agent deleted or doesn't belong to user)
                    print(f"⚠️  Orphaned phone_mapping for {num.phone_number} - agent deleted or not found")
                    actual_status = 'available'
                    agent_id = None

                    # Auto-cleanup: deactivate the orphaned mapping
                    phone_mapping.isActive = False
                    db.commit()
                    print(f"   ✅ Auto-deactivated orphaned mapping for {num.phone_number}")

            # Sync phone_number_pool if out of sync
            if num.status != actual_status or num.assigned_to_agent_id != agent_id:
                print(f"🔄 Syncing phone_number_pool for {num.phone_number}: {num.status} -> {actual_status}")
                num.status = actual_status
                num.assignedToAgentId = agent_id
                if actual_status == 'available':
                    num.assignedAt = None
                else:
                    num.assignedAt = assigned_at
                db.commit()

            result.append({
                'id': num.id,
                'phone_number': num.phone_number,
                'status': actual_status,  # Use actual status from phone_mappings
                'agent_name': agent_name,
                'agent_id': agent_id,
                'can_receive_calls': num.can_receive_calls,
                'can_send_calls': num.can_send_calls,
                'assigned_at': assigned_at.isoformat() if assigned_at else None,
                'created_at': num.created_at.isoformat() if num.created_at else None,
                # Additional metadata
                'country': num.country or 'Dominica',
                'country_code': num.country_code or '+1',
                'provider': 'EPIC Voice',  # Branded name
                'monthly_cost': num.monthly_cost or 0,
                # LiveKit info
                'livekit_inbound_trunk': num.livekit_inbound_trunk_id,
                'livekit_outbound_trunk': num.livekit_outbound_trunk_id,
                # Magnus info (for debugging)
                'magnus_did_id': num.magnus_did_id,
            })

        return jsonify({
            'success': True,
            'data': result
        })

    finally:
        db.close()


@app.route('/api/user/phone-numbers/provision', methods=['POST'])
def provision_phone_number():
    try:
        """Provision a new phone number for the user"""
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404

        data = request.json
        country = data.get('country', 'Dominica')
        prefix = data.get('prefix', '1767818')
        use_magnus = data.get('use_magnus', True)  # Default to Magnus if available

        db = SessionLocal()
        try:
            # Try Magnus first if enabled and requested
            print(f"🔍 Provision request: use_magnus={use_magnus}, magnus_client_exists={phone_manager.magnus_client is not None}")
            if use_magnus and phone_manager.magnus_client:
                print(f"🚀 Attempting Magnus Billing provisioning...")
                magnus_result = phone_manager.provision_number_from_magnus(db, user_id, country, prefix)
                print(f"📊 Magnus result: {magnus_result}")
                if magnus_result['success']:
                    phone_number = magnus_result['phone_number']
                    magnus_data = magnus_result

                    # Get LiveKit SIP domain from environment
                    import os
                    livekit_sip_domain = os.getenv('LIVEKIT_SIP_DOMAIN', '3m4yki5jezn.sip.livekit.cloud')

                    # Generate password for SIP user (will be used for LiveKit outbound trunk)
                    import random
                    import string
                    sip_password = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(12))

                    # Step 1: Update Magnus SIP user to route to LiveKit
                    print(f"🔧 Configuring Magnus SIP user for LiveKit integration...")
                    phone_manager.magnus_client.update_sip_for_livekit(
                        sip_id=magnus_data.get('sip_id'),
                        phone_number=phone_number,
                        password=sip_password,
                        livekit_sip_domain=livekit_sip_domain
                    )

                    # Step 2: Create LiveKit SIP Outbound Trunk (for agent to make calls)
                    # Uses the SAME password we set on Magnus SIP user
                    print(f"📞 Creating LiveKit SIP Outbound Trunk with Magnus credentials...")
                    outbound_result = asyncio.run(
                        telephony_manager.create_outbound_trunk(
                            username=phone_number,  # Use phone number as username
                            password=sip_password,   # Same password as Magnus SIP
                            sip_domain=magnus_data.get('sip_domain'),  # voice.epic.dm
                            phone_numbers=[phone_number],
                            user_id=user_id
                        )
                    )

                    # ✅ CRITICAL: Validate outbound trunk creation before proceeding
                    if not outbound_result.get('success'):
                        error_msg = f"Failed to create LiveKit outbound trunk: {outbound_result.get('error', 'Unknown error')}"
                        print(f"❌ {error_msg}")
                        # Rollback Magnus provisioning
                        if magnus_data.get('did_id'):
                            try:
                                phone_manager.magnus_client.delete_did(magnus_data.get('did_id'))
                                print(f"🔄 Rolled back Magnus DID {magnus_data.get('did_id')}")
                            except Exception as e:
                                print(f"⚠️ Failed to rollback Magnus DID: {e}")
                        return jsonify({
                            'success': False,
                            'error': {
                                'message': error_msg
                            }
                        }), 500

                    # Step 3: Create LiveKit SIP Inbound Trunk (for receiving calls)
                    print(f"📞 Creating LiveKit SIP Inbound Trunk for {phone_number}...")
                    inbound_result = asyncio.run(
                        telephony_manager.create_inbound_trunk([phone_number], user_id)
                    )

                    # ✅ CRITICAL: Validate inbound trunk creation before proceeding
                    if not inbound_result.get('success'):
                        error_msg = f"Failed to create LiveKit inbound trunk: {inbound_result.get('error', 'Unknown error')}"
                        print(f"❌ {error_msg}")
                        # Rollback outbound trunk
                        try:
                            asyncio.run(telephony_manager.delete_outbound_trunk(outbound_result.get('trunk_id')))
                            print(f"🔄 Rolled back outbound trunk {outbound_result.get('trunk_id')}")
                        except Exception as e:
                            print(f"⚠️ Failed to rollback outbound trunk: {e}")
                        # Rollback Magnus provisioning
                        if magnus_data.get('did_id'):
                            try:
                                phone_manager.magnus_client.delete_did(magnus_data.get('did_id'))
                                print(f"🔄 Rolled back Magnus DID {magnus_data.get('did_id')}")
                            except Exception as e:
                                print(f"⚠️ Failed to rollback Magnus DID: {e}")
                        return jsonify({
                            'success': False,
                            'error': {
                                'message': error_msg
                            }
                        }), 500

                    # Step 4: Update Magnus DID destination to route to LiveKit
                    # Format: SIP/17678183366@3m4yki5jezn.sip.livekit.cloud (no + sign)
                    clean_did = phone_number.replace('+', '')
                    livekit_sip_uri = f"SIP/{clean_did}@{livekit_sip_domain}"

                    if magnus_data.get('did_id'):
                        print(f"🔄 Updating Magnus DID destination to: {livekit_sip_uri}")
                        phone_manager.magnus_client.update_did_destination(
                            did_id=magnus_data.get('did_id'),
                            livekit_sip_uri=livekit_sip_uri
                        )

                    # Step 5: Store all credentials and trunk IDs in database
                    from phone_number_manager import PhoneNumberPool
                    pool_number = db.query(PhoneNumberPool).filter(
                        PhoneNumberPool.phone_number == phone_number
                    ).first()
                    if pool_number:
                        pool_number.livekit_inbound_trunk_id = inbound_result.get('trunk_id')
                        pool_number.livekit_outbound_trunk_id = outbound_result.get('trunk_id')
                        pool_number.magnus_sip_username = phone_number  # Phone number is the SIP username
                        pool_number.magnus_sip_password = sip_password  # Generated password
                        pool_number.magnus_sip_domain = livekit_sip_domain  # LiveKit SIP domain
                        pool_number.magnus_did_id = magnus_data.get('did_id')
                        pool_number.notes = f"Inbound: {inbound_result.get('trunk_id')}, Outbound: {outbound_result.get('trunk_id')}, LiveKit SIP: {livekit_sip_domain}"
                        db.commit()
                        print(f"✅ Stored trunk IDs and SIP credentials in database")

                    # Get the phone number object from database to return full details
                    pool_number_final = db.query(PhoneNumberPool).filter(
                        PhoneNumberPool.phone_number == phone_number
                    ).first()

                    phone_data = {
                        'id': pool_number_final.id,
                        'phone_number': phone_number,
                        'status': 'available',
                        'country': pool_number_final.country or 'Dominica',
                        'country_code': pool_number_final.country_code or '+1',
                        'provider': 'magnus',
                        'livekit_inbound_trunk_id': inbound_result.get('trunk_id'),
                        'livekit_outbound_trunk_id': outbound_result.get('trunk_id'),
                        'sip_username': magnus_data.get('username'),
                        'can_receive_calls': True,
                        'can_send_calls': True,
                    }

                    return jsonify({
                        'success': True,
                        'data': {
                            'phoneNumber': phone_data  # Wrap in phoneNumber key for frontend
                        },
                        'message': 'Phone number fully provisioned with bidirectional calling'
                    })

                # Magnus was explicitly requested but failed – do NOT silently fall back to local
                error_message = magnus_result.get('error', 'Magnus DID provisioning failed')
                print(f"❌ Magnus Billing provisioning failed, not falling back to local: {error_message}")
                return jsonify({
                    'success': False,
                    'error': {
                        'message': error_message
                    }
                }), 500

            # If Magnus is not requested or Magnus client is not configured, fall back to local generation
            result = phone_manager.provision_number(db, user_id, country, prefix)

            if result['success']:
                phone_number = result['phone_number']

                # Create LiveKit SIP Inbound Trunk for this number
                print(f"📞 Creating LiveKit SIP Inbound Trunk for {phone_number}...")
                trunk_result = asyncio.run(
                    telephony_manager.create_inbound_trunk([phone_number], user_id)
                )

                if trunk_result['success']:
                    print(f"✅ LiveKit trunk created: {trunk_result['trunk_id']}")
                    # Store trunk_id in phone number pool
                    from phone_number_manager import PhoneNumberPool
                    pool_number = db.query(PhoneNumberPool).filter(
                        PhoneNumberPool.phone_number == phone_number
                    ).first()
                    if pool_number:
                        pool_number.notes = f"LiveKit Trunk ID: {trunk_result['trunk_id']}"
                        db.commit()
                else:
                    print(f"⚠️ LiveKit trunk creation failed: {trunk_result['error']}")

                # Get the phone number object from database to return full details
                pool_number = db.query(PhoneNumberPool).filter(
                    PhoneNumberPool.phone_number == phone_number
                ).first()

                phone_data = {
                    'id': pool_number.id if pool_number else str(uuid.uuid4()),
                    'phone_number': phone_number,
                    'status': 'available',
                    'country': pool_number.country if pool_number else 'Dominica',
                    'country_code': pool_number.country_code if pool_number else '+1',
                    'provider': 'local',
                    'livekit_trunk_id': trunk_result.get('trunk_id'),
                    'can_receive_calls': True,
                    'can_send_calls': True,
                }

                return jsonify({
                    'success': True,
                    'data': {
                        'phoneNumber': phone_data  # Wrap in phoneNumber key for frontend
                    },
                    'message': 'Phone number provisioned successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {
                        'message': result.get('error', 'Failed to provision phone number')
                    }
                }), 500

        finally:
            db.close()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {
                'message': str(e)
            }
        }), 500


@app.route('/api/user/phone-numbers/<phone_number>/assign', methods=['POST'])
def assign_phone_to_agent(phone_number):
    """Assign a phone number to an agent"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    data = request.json
    agent_id = data.get('agent_id')

    if not agent_id:
        return jsonify({'error': 'agent_id is required'}), 400

    db = SessionLocal()
    try:
        # Verify user owns the agent
        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id
        ).first()

        if not agent:
            return jsonify({'error': 'Agent not found'}), 404

        # Note: Agents can be assigned phone numbers even if not deployed yet
        # The routing will be set up, and will become active when agent is deployed

        # Check if agent already has a phone number assigned (limit one per agent)
        existing_mapping = db.query(PhoneMapping).filter(
            PhoneMapping.agentConfigId == agent_id,
            PhoneMapping.isActive == True
        ).first()

        if existing_mapping:
            return jsonify({
                'success': False,
                'error': f'Agent already has a phone number assigned: {existing_mapping.phoneNumber}. Each agent can only have one phone number at a time.'
            }), 400

        # Assign in database first
        result = phone_manager.assign_to_agent(db, phone_number, agent_id, user_id)

        if result['success']:
            # Get the trunk ID from phone number pool
            from phone_number_manager import PhoneNumberPool
            pool_number = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.phone_number == phone_number
            ).first()

            # Get inbound trunk ID for dispatch rule
            trunk_id = pool_number.livekit_inbound_trunk_id if pool_number else None

            # Check for existing dispatch rules for this phone number and delete them
            print(f"🔍 Checking for existing dispatch rules for {phone_number}...")
            find_result = asyncio.run(
                telephony_manager.find_dispatch_rules_for_phone(phone_number, trunk_id)
            )

            if find_result['success'] and find_result['rules']:
                print(f"🗑️  Found {len(find_result['rules'])} existing rules, deleting...")
                for rule_id in find_result['rules']:
                    delete_result = asyncio.run(telephony_manager.delete_dispatch_rule(rule_id))
                    if delete_result['success']:
                        print(f"✅ Deleted old dispatch rule: {rule_id}")
                    else:
                        print(f"⚠️  Failed to delete rule {rule_id}: {delete_result.get('error')}")

            # Create LiveKit dispatch rule to route calls to this agent
            print(f"🎯 Creating LiveKit Dispatch Rule for {phone_number} → {agent.name}...")

            trunk_ids = [trunk_id] if trunk_id else []
            if trunk_ids:
                print(f"📋 Using trunk ID: {trunk_id}")

            # Create dispatch rule with agent name
            # Agent name should match the deployed agent's name in LiveKit
            dispatch_result = asyncio.run(
                telephony_manager.create_dispatch_rule(
                    agent_name=agent.name,
                    trunk_ids=trunk_ids,
                    phone_numbers=[phone_number],
                    user_id=user_id
                )
            )

            if dispatch_result['success']:
                print(f"✅ LiveKit dispatch rule created: {dispatch_result['rule_id']}")

                # Store rule_id in phone mapping
                mapping = db.query(PhoneMapping).filter(
                    PhoneMapping.phoneNumber == phone_number,
                    PhoneMapping.isActive == True
                ).first()

                if mapping:
                    # Store dispatch rule ID in metadata (if PhoneMapping has metadata field)
                    # For now, just log it
                    print(f"📝 Dispatch rule {dispatch_result['rule_id']} linked to mapping")

                return jsonify({
                    'success': True,
                    'message': f'Phone number assigned to {agent.name}',
                    'livekit_dispatch_rule_id': dispatch_result['rule_id']
                })
            else:
                print(f"⚠️ LiveKit dispatch rule creation failed: {dispatch_result['error']}")
                return jsonify({
                    'success': True,
                    'message': f'Phone number assigned to {agent.name} (LiveKit dispatch rule creation failed)',
                    'warning': dispatch_result['error']
                })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400

    except Exception as e:
        db.rollback()
        print(f"❌ Error in assign_phone_to_agent: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Internal error: {str(e)}'
        }), 500
    finally:
        db.close()


@app.route('/api/user/phone-numbers/<phone_number>/unassign', methods=['POST'])
def unassign_phone_from_agent(phone_number):
    """Remove agent assignment from a phone number"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404
    
    db = SessionLocal()
    try:
        result = phone_manager.unassign_from_agent(db, phone_number, user_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Phone number unassigned successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
            
    finally:
        db.close()


@app.route('/api/user/phone-numbers/<phone_number>', methods=['DELETE'])
def delete_user_phone_number(phone_number):
    """Delete a phone number from user's account and clean up LiveKit/Magnus resources"""
    from phone_number_manager import PhoneNumberPool, PhoneNumberHistory

    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    db = SessionLocal()
    try:
        # Check if user owns this number
        pool_number = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone_number,
            PhoneNumberPool.assigned_to_user_id == user_id
        ).first()

        if not pool_number:
            return jsonify({
                'success': False,
                'error': 'Phone number not found or you do not own this number'
            }), 404

        cleanup_results = []

        # Delete LiveKit Inbound Trunk if exists
        if pool_number.livekit_inbound_trunk_id:
            print(f"🗑️  Deleting LiveKit Inbound Trunk: {pool_number.livekit_inbound_trunk_id}")
            trunk_result = asyncio.run(
                telephony_manager.delete_inbound_trunk(pool_number.livekit_inbound_trunk_id)
            )
            if trunk_result['success']:
                cleanup_results.append('LiveKit Inbound Trunk deleted')
            else:
                cleanup_results.append(f'LiveKit Inbound Trunk error: {trunk_result.get("error")}')

        # Delete LiveKit Outbound Trunk if exists
        if pool_number.livekit_outbound_trunk_id:
            print(f"🗑️  Deleting LiveKit Outbound Trunk: {pool_number.livekit_outbound_trunk_id}")
            # Note: LiveKit doesn't have separate delete for outbound, uses same delete_inbound_trunk
            trunk_result = asyncio.run(
                telephony_manager.delete_inbound_trunk(pool_number.livekit_outbound_trunk_id)
            )
            if trunk_result['success']:
                cleanup_results.append('LiveKit Outbound Trunk deleted')
            else:
                cleanup_results.append(f'LiveKit Outbound Trunk error: {trunk_result.get("error")}')

        # Delete from Magnus Billing if this was a Magnus-provisioned number
        if pool_number.magnus_did_id and phone_manager.magnus_client:
            print(f"🗑️  Deleting DID from Magnus Billing: {pool_number.magnus_did_id}")
            magnus_result = phone_manager.magnus_client.delete_did(
                did_id=pool_number.magnus_did_id,
                phone_number=phone_number
            )
            if magnus_result.get('success'):
                deleted_resources = magnus_result.get('deleted', [])
                cleanup_results.append(f'Magnus Billing: deleted {", ".join(deleted_resources)}')
            else:
                errors = magnus_result.get('errors', [])
                cleanup_results.append(f'Magnus Billing errors: {"; ".join(errors)}')

        # Deactivate any active mappings
        db.query(PhoneMapping).filter(
            PhoneMapping.phoneNumber == phone_number,
            PhoneMapping.userId == user_id
        ).update({'isActive': False})

        # Delete from pool
        db.delete(pool_number)

        # Log the deletion
        history = PhoneNumberHistory(
            phone_number=phone_number,
            user_id=user_id,
            action='deleted',
            previous_status=pool_number.status,
            new_status='deleted',
            notes='; '.join(cleanup_results) if cleanup_results else 'Phone number deleted'
        )
        db.add(history)

        db.commit()

        return jsonify({
            'success': True,
            'message': f'Phone number {phone_number} deleted successfully',
            'cleanup': cleanup_results
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()


@app.route('/api/user/phone-numbers/available', methods=['GET'])
def get_available_phone_numbers():
    """Get phone numbers owned by user but not assigned to any agent"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404
    
    db = SessionLocal()
    try:
        numbers = phone_manager.get_available_numbers(db, user_id)
        
        result = [{
            'id': num.id,
            'phone_number': num.phone_number,
            'status': num.status,
            'can_receive_calls': num.can_receive_calls,
            'can_send_calls': num.can_send_calls
        } for num in numbers]
        
        return jsonify({
            'success': True,
            'available_numbers': result
        })
        
    finally:
        db.close()


@app.route('/api/user/calls/test-outbound', methods=['POST'])
def test_outbound_call():
    """
    Test outbound calling capability
    Creates a SIP call from an assigned phone number to a test destination
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    data = request.json
    to_number = data.get('to_number')
    agent_id = data.get('agent_id')

    print(f"🔧 DEBUG test_outbound_call received:")
    print(f"   to_number={to_number}")
    print(f"   agent_id={agent_id}")
    print(f"   user_id={user_id}")

    if not to_number or not agent_id:
        return jsonify({
            'success': False,
            'error': {
                'message': 'agent_id and to_number are required',
                'code': 'MISSING_PARAMETERS'
            }
        }), 400

    db = SessionLocal()
    try:
        # Verify agent exists and belongs to user
        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id,
            AgentConfig.isActive == True
        ).first()
        if not agent:
            return jsonify({
                'success': False,
                'error': {
                    'message': 'Agent configuration not found',
                    'code': 'AGENT_NOT_FOUND'
                }
            }), 404

        # Get phone number from phone_mappings (source of truth for agent-phone assignments)
        phone_mapping = db.query(PhoneMapping).filter(
            PhoneMapping.agentConfigId == agent_id,
            PhoneMapping.userId == user_id,
            PhoneMapping.isActive == True
        ).first()

        if not phone_mapping:
            return jsonify({
                'success': False,
                'error': {
                    'message': 'This agent does not have a phone number assigned',
                    'code': 'PHONE_NOT_ASSIGNED'
                }
            }), 404

        from_number = phone_mapping.phoneNumber
        print(f"📞 Found phone mapping: {from_number}")

        # Verify user owns the phone number in phone_number_pool
        from phone_number_manager import PhoneNumberPool
        pool_number = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == from_number,
            PhoneNumberPool.assigned_to_user_id == user_id
        ).first()

        if not pool_number:
            return jsonify({
                'success': False,
                'error': {
                    'message': 'Phone number not found in pool or you do not own it',
                    'code': 'PHONE_NOT_IN_POOL'
                }
            }), 404

        # Check if it has outbound capability
        if not pool_number.livekit_outbound_trunk_id:
            return jsonify({
                'success': False,
                'error': {
                    'message': 'Phone number does not have outbound calling configured',
                    'code': 'OUTBOUND_NOT_CONFIGURED'
                }
            }), 400

        # Always use tst0002 as the infrastructure agent
        # agent_id is passed as agent_config_id for dynamic routing
        agent_name = "tst0002"  # Infrastructure agent that handles all calls

        # Create outbound call via LiveKit
        print(f"📞 Testing outbound call: {from_number} → {to_number}")
        if agent_id:
            print(f"🔀 Using agent config: {agent_id}")

        # Use LiveKit's create_room API to initiate call
        call_result = asyncio.run(
            telephony_manager.create_outbound_call(
                from_number=from_number,
                to_number=to_number,
                trunk_id=pool_number.livekit_outbound_trunk_id,
                agent_name=agent_name,
                agent_config_id=agent_id  # Pass for dynamic routing
            )
        )

        if call_result['success']:
            return jsonify({
                'success': True,
                'data': {
                    'call_id': call_result.get('call_id'),
                    'room_name': call_result.get('room_name'),
                    'message': f'Outbound call initiated from {from_number} to {to_number}'
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': {
                    'message': call_result.get('error', 'Failed to create outbound call'),
                    'code': 'OUTBOUND_CALL_FAILED'
                }
            }), 500

    except Exception as e:
        print(f"❌ Error in test_outbound_call: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {
                'message': f'Internal error: {str(e)}',
                'code': 'INTERNAL_ERROR'
            }
        }), 500
    finally:
        db.close()


@app.route('/api/phone-routing/<phone_number>', methods=['GET'])
def get_phone_routing(phone_number):
    """Get routing information for incoming call (for LiveKit/SIP)"""
    db = SessionLocal()
    try:
        routing_info = phone_manager.get_routing_info(db, phone_number)
        
        if routing_info:
            return jsonify({
                'success': True,
                'routing': routing_info
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No routing found for this number'
            }), 404
            
    finally:
        db.close()


@app.route('/api/user/phone-numbers/<phone_number>/check', methods=['GET'])
def check_phone_duplicate(phone_number):
    """Check if phone number is already in use"""
    db = SessionLocal()
    try:
        result = phone_manager.check_duplicate(db, phone_number)
        return jsonify(result)
    finally:
        db.close()


# ============================================================================
# Analytics Endpoints
# ============================================================================

@app.route('/api/analytics/stats', methods=['GET'])
def get_analytics_stats():
    """Get analytics statistics for current user"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404
    
    db = SessionLocal()
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # Total calls
        total_calls = db.query(func.count(CallLog.id)).filter(
            CallLog.userId == user_id
        ).scalar() or 0
        
        # Total cost
        total_cost = db.query(func.sum(cast(func.nullif(CallLog.cost, ''), Float))).filter(
            CallLog.userId == user_id
        ).scalar() or 0.0
        
        # Average duration
        avg_duration = db.query(func.avg(CallLog.durationSeconds)).filter(
            CallLog.userId == user_id
        ).scalar() or 0
        
        # Active agents
        active_agents = db.query(func.count(AgentConfig.id)).filter(
            AgentConfig.userId == user_id,
            AgentConfig.status.in_(['deployed', 'active'])
        ).scalar() or 0
        
        # Calls this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        calls_this_week = db.query(func.count(CallLog.id)).filter(
            CallLog.userId == user_id,
            CallLog.startedAt >= week_ago
        ).scalar() or 0
        
        # Cost this week
        cost_this_week = db.query(func.sum(cast(func.nullif(CallLog.cost, ''), Float))).filter(
            CallLog.userId == user_id,
            CallLog.startedAt >= week_ago
        ).scalar() or 0.0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_calls': total_calls,
                'total_cost': round(total_cost, 2),
                'avg_duration': round(avg_duration, 0),
                'active_agents': active_agents,
                'calls_this_week': calls_this_week,
                'cost_this_week': round(cost_this_week, 2)
            }
        })
        
    finally:
        db.close()


@app.route('/api/analytics/call-volume', methods=['GET'])
def get_call_volume():
    """Get call volume data for charts"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404
    
    db = SessionLocal()
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # Last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        # Get all calls from last 7 days
        calls = db.query(CallLog).filter(
            CallLog.userId == user_id,
            CallLog.startedAt >= week_ago
        ).all()
        
        # Group by date manually (SQLite-compatible)
        date_counts = {}
        for call in calls:
            if call.started_at:
                call_date = call.started_at.date()
                date_counts[call_date] = date_counts.get(call_date, 0) + 1
        
        # Format data for last 7 days
        result = []
        for i in range(7):
            date = (datetime.utcnow() - timedelta(days=6-i)).date()
            calls_count = date_counts.get(date, 0)
            result.append({
                'name': date.strftime('%a'),
                'calls': calls_count,
                'date': str(date)
            })
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        print(f"❌ Error in call-volume endpoint: {e}")
        return jsonify({
            'success': True,
            'data': []  # Return empty data instead of error
        })
        
    finally:
        db.close()


@app.route('/api/analytics/agent-distribution', methods=['GET'])
def get_agent_distribution():
    """Get call distribution by agent"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404
    
    db = SessionLocal()
    try:
        from sqlalchemy import func
        
        # Group by agent
        agent_calls = db.query(
            AgentConfig.name,
            AgentConfig.id,
            func.count(CallLog.id).label('calls')
        ).outerjoin(
            CallLog, CallLog.agentConfigId == AgentConfig.id
        ).filter(
            AgentConfig.userId == user_id
        ).group_by(
            AgentConfig.id, AgentConfig.name
        ).all()
        
        # Format data
        result = []
        colors = ['#4F46E5', '#22D3EE', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444']
        for idx, (name, agent_id, calls) in enumerate(agent_calls):
            result.append({
                'name': name,
                'value': calls,
                'color': colors[idx % len(colors)]
            })
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    finally:
        db.close()


# ============================================================================
# API v1 Endpoints (Aliases for frontend compatibility)
# ============================================================================

@app.route('/api/v1/agents', methods=['GET'])
def get_agents_v1():
    """Get all agents for current user (v1 API)."""
    return get_agents()

@app.route('/api/v1/agents', methods=['POST'])
def create_agent_v1():
    """Create new agent (v1 API)."""
    return create_agent()

@app.route('/api/v1/agents/<agent_id>', methods=['PUT'])
def update_agent_v1(agent_id):
    """Update agent (v1 API)."""
    return update_agent(agent_id)

@app.route('/api/v1/agents/<agent_id>', methods=['DELETE'])
def delete_agent_v1(agent_id):
    """Delete agent (v1 API)."""
    return delete_agent(agent_id)

@app.route('/api/v1/phone-numbers', methods=['GET'])
def get_phone_numbers_v1():
    """Get phone numbers (v1 API)."""
    return get_user_phone_numbers()

@app.route('/api/v1/stats', methods=['GET'])
def get_stats_v1():
    """Get stats (v1 API)."""
    return get_stats()


# Import and set up SIP API endpoints
try:
    from sip_api_endpoints import setup_sip_endpoints
    # Make get_current_user_id accessible to the SIP API endpoints
    app.get_current_user_id = get_current_user_id
    # Initialize SIP endpoints
    app = setup_sip_endpoints(app)
    print("✅ SIP API endpoints initialized")
except Exception as e:
    print(f"❌ Error setting up SIP API endpoints: {e}")

# Import and set up White-Label API endpoints
try:
    from white_label_api_endpoints import setup_white_label_endpoints
    # Make get_current_user_id accessible to white-label endpoints
    app.get_current_user_id = get_current_user_id
    # Initialize white-label endpoints
    app = setup_white_label_endpoints(app)
    print("✅ White-label API endpoints initialized")
except Exception as e:
    print(f"❌ Error setting up white-label API endpoints: {e}")

# Import and set up Lead & Campaign API endpoints
try:
    from lead_campaign_api_endpoints import setup_lead_campaign_endpoints
    # Make get_current_user_id accessible to lead/campaign endpoints
    app.get_current_user_id = get_current_user_id
    # Initialize lead & campaign endpoints
    app = setup_lead_campaign_endpoints(app)
    print("✅ Lead & Campaign API endpoints initialized")
except Exception as e:
    print(f"❌ Error setting up Lead & Campaign API endpoints: {e}")

# Import and set up Webhook API endpoints
try:
    from webhook_api_endpoints import setup_webhook_endpoints
    # Make get_current_user_id accessible to webhook endpoints
    app.get_current_user_id = get_current_user_id
    # Initialize webhook endpoints
    app = setup_webhook_endpoints(app)
    print("✅ Webhook API endpoints initialized")
except Exception as e:
    print(f"❌ Error setting up Webhook API endpoints: {e}")

# Import and set up Odoo Integration API endpoints
try:
    from odoo_api_endpoints import setup_odoo_endpoints
    # Make get_current_user_id accessible to Odoo endpoints
    app.get_current_user_id = get_current_user_id
    # Initialize Odoo endpoints
    app = setup_odoo_endpoints(app)
    print("✅ Odoo integration API endpoints initialized")
except Exception as e:
    print(f"❌ Error setting up Odoo integration API endpoints: {e}")

# Import and set up CDR Integration API endpoints
try:
    from cdr_api_endpoints import setup_cdr_endpoints
    # Make get_current_user_id accessible to CDR endpoints
    app.get_current_user_id = get_current_user_id
    # Initialize CDR endpoints
    app = setup_cdr_endpoints(app)
    print("✅ CDR integration API endpoints initialized")
except Exception as e:
    print(f"❌ Error setting up CDR integration API endpoints: {e}")

# Register cost tracking API endpoints
try:
    from backend.cost_tracking.api_endpoints import cost_bp
    app.register_blueprint(cost_bp)
    print("✅ Cost tracking API endpoints initialized")
except Exception as e:
    print(f"❌ Error setting up cost tracking API endpoints: {e}")

# Register AMI (Asterisk Manager Interface) API endpoints
try:
    from backend.ami.routes import ami_bp, set_ami_manager
    from backend.ami.manager import AMIManager
    import threading

    app.register_blueprint(ami_bp)
    print("✅ AMI API endpoints registered at /api/ami")

    # Initialize AMI manager in background thread
    ami_manager_instance = AMIManager()
    set_ami_manager(ami_manager_instance)

    def start_ami_manager():
        """Start AMI manager in event loop"""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(ami_manager_instance.connect())
            print("✅ AMI Manager connected and listening for events")
            # Keep event loop running
            loop.run_forever()
        except Exception as e:
            print(f"❌ AMI Manager error: {e}")
        finally:
            loop.close()

    # Start AMI manager in background thread
    ami_thread = threading.Thread(target=start_ami_manager, daemon=True)
    ami_thread.start()
    print("✅ AMI Manager started in background thread")

except Exception as e:
    print(f"⚠️  AMI initialization skipped: {e}")
    print("   (AMI features will not be available)")

# Initialize database tables on startup (runs regardless of how file is executed)
print("🔧 Initializing database tables...")
try:
    from database import engine, init_db
    # Use init_db() which ensures all models are loaded
    init_db()
    print("✅ Database tables created successfully")
except Exception as e:
    print(f"⚠️  Database initialization error: {e}")

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5001))
    print("🚀 Starting User Dashboard")
    print(f"📊 Dashboard will be available at: http://0.0.0.0:{port}")
    print(f"🔌 WebSocket endpoint: ws://0.0.0.0:{port}/socket.io/")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
