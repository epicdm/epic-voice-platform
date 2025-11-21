"""
LiveKit Agent Management Dashboard
===================================
Web-based interface for managing LiveKit agent settings on a headless server.
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from dotenv import load_dotenv, set_key, find_dotenv
import os
import subprocess
import json
from datetime import datetime
import threading
import queue
import signal
import psutil

app = Flask(__name__)
load_dotenv()

# Global state
agent_process = None
log_queue = queue.Queue(maxsize=1000)

def find_agent_process():
    """Find running LiveKit agent process."""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info['cmdline']
            if cmdline and 'livekit_basic_agent.py' in ' '.join(cmdline):
                return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None

def get_env_config():
    """Read current environment configuration."""
    default_instructions = """You are a helpful and friendly Airbnb voice assistant.
You can help users search for Airbnbs in different cities and book their stays.
Keep your responses concise and natural, as if having a conversation."""
    
    config = {
        'LIVEKIT_URL': os.getenv('LIVEKIT_URL', ''),
        'LIVEKIT_API_KEY': os.getenv('LIVEKIT_API_KEY', ''),
        'LIVEKIT_API_SECRET': os.getenv('LIVEKIT_API_SECRET', ''),
        'AGENT_NAME': os.getenv('AGENT_NAME', ''),
        'SIP_OUTBOUND_TRUNK_ID': os.getenv('SIP_OUTBOUND_TRUNK_ID', ''),
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY', ''),
        'DEEPGRAM_API_KEY': os.getenv('DEEPGRAM_API_KEY', ''),
        'DEFAULT_LANGUAGE': os.getenv('DEFAULT_LANGUAGE', 'en-US'),
        'AGENT_VOICE': os.getenv('AGENT_VOICE', 'alloy'),
        'AGENT_TEMPERATURE': os.getenv('AGENT_TEMPERATURE', '0.7'),
        'LLM_CHOICE': os.getenv('LLM_CHOICE', 'gpt-4o-mini'),
        'EPIC_SIP_DOMAIN': os.getenv('EPIC_SIP_DOMAIN', ''),
        'EPIC_SIP_TRANSPORT': os.getenv('EPIC_SIP_TRANSPORT', 'tcp'),
        'AGENT_INSTRUCTIONS': os.getenv('AGENT_INSTRUCTIONS', default_instructions),
    }
    return config

def update_env_config(updates):
    """Update environment variables in .env file."""
    env_file = find_dotenv()
    if not env_file:
        env_file = '.env'
    
    for key, value in updates.items():
        set_key(env_file, key, value)
    
    # Reload environment
    load_dotenv(override=True)
    return True

def get_agent_status():
    """Get current agent status."""
    proc = find_agent_process()
    if proc:
        try:
            return {
                'running': True,
                'pid': proc.pid,
                'cpu_percent': proc.cpu_percent(),
                'memory_mb': proc.memory_info().rss / 1024 / 1024,
                'uptime_seconds': (datetime.now() - datetime.fromtimestamp(proc.create_time())).total_seconds()
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return {'running': False}
    return {'running': False}

def start_agent():
    """Start the LiveKit agent."""
    try:
        # Check if already running
        if find_agent_process():
            return {'success': False, 'message': 'Agent is already running'}
        
        # Start agent in background
        process = subprocess.Popen(
            ['uv', 'run', 'python', 'livekit_basic_agent.py', 'dev'],
            cwd='/opt/livekit1',
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        return {'success': True, 'message': f'Agent started with PID {process.pid}', 'pid': process.pid}
    except Exception as e:
        return {'success': False, 'message': f'Failed to start agent: {str(e)}'}

def stop_agent():
    """Stop the LiveKit agent."""
    try:
        proc = find_agent_process()
        if not proc:
            return {'success': False, 'message': 'Agent is not running'}
        
        proc.terminate()
        proc.wait(timeout=10)
        return {'success': True, 'message': 'Agent stopped successfully'}
    except Exception as e:
        return {'success': False, 'message': f'Failed to stop agent: {str(e)}'}

def restart_agent():
    """Restart the LiveKit agent."""
    stop_result = stop_agent()
    if not stop_result['success'] and 'not running' not in stop_result['message']:
        return stop_result
    
    import time
    time.sleep(2)
    return start_agent()

def get_sip_info():
    """Get SIP trunk and dispatch rule information."""
    try:
        # Get inbound trunks
        result = subprocess.run(
            ['lk', 'sip', 'inbound', 'list', '--json'],
            capture_output=True,
            text=True,
            cwd='/opt/livekit1'
        )
        
        trunks = []
        if result.returncode == 0:
            try:
                trunks = json.loads(result.stdout) if result.stdout else []
            except:
                pass
        
        # Get dispatch rules
        result = subprocess.run(
            ['lk', 'sip', 'dispatch', 'list', '--json'],
            capture_output=True,
            text=True,
            cwd='/opt/livekit1'
        )
        
        dispatch_rules = []
        if result.returncode == 0:
            try:
                dispatch_rules = json.loads(result.stdout) if result.stdout else []
            except:
                pass
        
        return {
            'trunks': trunks,
            'dispatch_rules': dispatch_rules
        }
    except Exception as e:
        return {'error': str(e), 'trunks': [], 'dispatch_rules': []}

@app.route('/')
def index():
    """Main dashboard page."""
    return render_template('dashboard.html')

@app.route('/api/status')
def api_status():
    """Get agent status."""
    return jsonify(get_agent_status())

@app.route('/api/config', methods=['GET', 'POST'])
def api_config():
    """Get or update configuration."""
    if request.method == 'GET':
        return jsonify(get_env_config())
    
    elif request.method == 'POST':
        updates = request.json
        if update_env_config(updates):
            return jsonify({'success': True, 'message': 'Configuration updated successfully'})
        return jsonify({'success': False, 'message': 'Failed to update configuration'}), 500

@app.route('/api/agent/start', methods=['POST'])
def api_agent_start():
    """Start the agent."""
    return jsonify(start_agent())

@app.route('/api/agent/stop', methods=['POST'])
def api_agent_stop():
    """Stop the agent."""
    return jsonify(stop_agent())

@app.route('/api/agent/restart', methods=['POST'])
def api_agent_restart():
    """Restart the agent."""
    return jsonify(restart_agent())

@app.route('/api/sip')
def api_sip():
    """Get SIP information."""
    return jsonify(get_sip_info())

@app.route('/api/logs')
def api_logs():
    """Stream agent logs."""
    def generate():
        proc = find_agent_process()
        if not proc:
            yield f"data: {json.dumps({'message': 'Agent is not running'})}\n\n"
            return
        
        try:
            # Read recent logs
            log_file = '/opt/livekit1/agent.log'
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    lines = f.readlines()[-100:]  # Last 100 lines
                    for line in lines:
                        yield f"data: {json.dumps({'message': line.strip()})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'message': f'Error reading logs: {str(e)}'})}\n\n"
    
    return app.response_class(generate(), mimetype='text/event-stream')

if __name__ == '__main__':
    print("🚀 Starting LiveKit Agent Management Dashboard")
    print("📊 Dashboard will be available at: http://localhost:5000")
    print("🔐 Make sure to secure this with authentication in production!")
    app.run(host='0.0.0.0', port=5000, debug=False)
