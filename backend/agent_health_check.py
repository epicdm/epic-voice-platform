"""
Agent Health Check Module

Checks if agent processes are running and responsive
"""
import os
import subprocess
import psutil
from datetime import datetime
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

def check_agent_process_running(agent_name: str, agent_dir: str = None) -> Dict:
    """
    Check if an agent process is running

    Args:
        agent_name: Name of the agent (e.g., "customer_support_agent")
        agent_dir: Optional directory path where agent should be running

    Returns:
        {
            'running': True/False,
            'pid': 12345 or None,
            'uptime_seconds': 3600 or None,
            'cpu_percent': 2.5 or None,
            'memory_mb': 150.5 or None,
            'last_heartbeat': '2025-11-20 19:45:00' or None
        }
    """
    try:
        # Strategy 1: Look for python process running agent.py or main.py in specific directory
        if agent_dir and os.path.exists(agent_dir):
            agent_py_path = os.path.join(agent_dir, 'agent.py')
            main_py_path = os.path.join(agent_dir, 'main.py')

            # Check for process running this specific agent.py or main.py
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 'cpu_percent', 'memory_info']):
                try:
                    cmdline = proc.info.get('cmdline', [])
                    if cmdline and 'python' in cmdline[0].lower():
                        # Check if this process is running our agent.py or main.py
                        if any(agent_py_path in arg for arg in cmdline) or any(main_py_path in arg for arg in cmdline):
                            # Found the agent process!
                            create_time = proc.info.get('create_time', 0)
                            uptime = int(datetime.now().timestamp() - create_time) if create_time else None

                            # Get memory info
                            memory_info = proc.info.get('memory_info')
                            memory_mb = memory_info.rss / (1024 * 1024) if memory_info else None

                            return {
                                'running': True,
                                'pid': proc.info['pid'],
                                'uptime_seconds': uptime,
                                'cpu_percent': proc.info.get('cpu_percent', 0),
                                'memory_mb': round(memory_mb, 2) if memory_mb else None,
                                'last_heartbeat': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                'agent_directory': agent_dir
                            }
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

        # Strategy 2: Look for any agent process with matching name pattern
        # This catches agents even if we don't know the exact directory
        normalized_name = agent_name.lower().replace(' ', '_').replace('-', '_')

        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
            try:
                cmdline = proc.info.get('cmdline', [])
                if cmdline and 'python' in cmdline[0].lower():
                    # Check if agent name appears in command line
                    cmdline_str = ' '.join(cmdline).lower()
                    if normalized_name in cmdline_str and ('agent.py' in cmdline_str or 'main.py' in cmdline_str):
                        create_time = proc.info.get('create_time', 0)
                        uptime = int(datetime.now().timestamp() - create_time) if create_time else None

                        return {
                            'running': True,
                            'pid': proc.info['pid'],
                            'uptime_seconds': uptime,
                            'cpu_percent': None,
                            'memory_mb': None,
                            'last_heartbeat': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'agent_directory': None
                        }
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        # Strategy 3: Look for any Python process running main.py or agent.py in /opt/livekit1/agents
        # This catches agents that use generic directory names (like tst0002)
        base_agents_path = '/opt/livekit1/agents'
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 'cpu_percent', 'memory_info', 'cwd']):
            try:
                cmdline = proc.info.get('cmdline', [])
                if cmdline and 'python' in cmdline[0].lower():
                    cmdline_str = ' '.join(cmdline)
                    proc_cwd = proc.info.get('cwd', '')

                    # Check if running main.py or agent.py AND (path in cmdline OR cwd in agents directory)
                    if ('main.py' in cmdline_str or 'agent.py' in cmdline_str):
                        if base_agents_path in cmdline_str or (proc_cwd and base_agents_path in proc_cwd):
                            # Found an agent process - assume it's ours if we only have one agent running
                            create_time = proc.info.get('create_time', 0)
                            uptime = int(datetime.now().timestamp() - create_time) if create_time else None

                            # Get memory info
                            memory_info = proc.info.get('memory_info')
                            memory_mb = memory_info.rss / (1024 * 1024) if memory_info else None

                            # Extract directory from cmdline or use cwd
                            detected_dir = proc_cwd if proc_cwd and base_agents_path in proc_cwd else None
                            if not detected_dir:
                                for arg in cmdline:
                                    if base_agents_path in arg and ('main.py' in arg or 'agent.py' in arg):
                                        detected_dir = os.path.dirname(arg)
                                        break

                            return {
                                'running': True,
                                'pid': proc.info['pid'],
                                'uptime_seconds': uptime,
                                'cpu_percent': proc.info.get('cpu_percent', 0),
                                'memory_mb': round(memory_mb, 2) if memory_mb else None,
                                'last_heartbeat': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                'agent_directory': detected_dir or agent_dir
                            }
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        # No agent process found
        return {
            'running': False,
            'pid': None,
            'uptime_seconds': None,
            'cpu_percent': None,
            'memory_mb': None,
            'last_heartbeat': None,
            'agent_directory': agent_dir
        }

    except Exception as e:
        logger.error(f"Error checking agent process: {e}")
        return {
            'running': False,
            'pid': None,
            'uptime_seconds': None,
            'cpu_percent': None,
            'memory_mb': None,
            'last_heartbeat': None,
            'error': str(e)
        }

def get_agent_directory(agent_id: str, agent_name: str) -> Optional[str]:
    """
    Try to locate the agent directory

    Args:
        agent_id: Agent UUID
        agent_name: Agent name

    Returns:
        Path to agent directory or None
    """
    base_path = '/opt/livekit1/agents'

    if not os.path.exists(base_path):
        return None

    # Try various naming conventions
    possible_names = [
        agent_name.lower().replace(' ', '_'),
        agent_id[:8],  # First 8 chars of UUID
        f"{agent_name.lower().replace(' ', '_')}_{agent_id[:8]}"
    ]

    for name in possible_names:
        agent_dir = os.path.join(base_path, name)
        # Check for agent.py or main.py
        if os.path.exists(agent_dir) and (os.path.exists(os.path.join(agent_dir, 'agent.py')) or os.path.exists(os.path.join(agent_dir, 'main.py'))):
            return agent_dir

    # Search for any directory containing the agent ID or name
    try:
        for dirname in os.listdir(base_path):
            dir_path = os.path.join(base_path, dirname)
            if os.path.isdir(dir_path):
                # Check if agent.py or main.py exists
                if os.path.exists(os.path.join(dir_path, 'agent.py')) or os.path.exists(os.path.join(dir_path, 'main.py')):
                    # Check if this directory is associated with our agent
                    # (Could check config files, etc.)
                    if agent_id[:8] in dirname or agent_name.lower().replace(' ', '_') in dirname.lower():
                        return dir_path
    except Exception as e:
        logger.error(f"Error searching agent directories: {e}")

    return None

def start_agent_process(agent_id: str, agent_name: str, agent_dir: str = None) -> Dict:
    """
    Start an agent process

    Args:
        agent_id: Agent UUID
        agent_name: Agent name
        agent_dir: Optional agent directory path (will be auto-detected if not provided)

    Returns:
        {
            'success': True/False,
            'pid': 12345 or None,
            'message': 'Started successfully' or error message
        }
    """
    try:
        # Get agent directory if not provided
        if not agent_dir:
            agent_dir = get_agent_directory(agent_id, agent_name)

        if not agent_dir or not os.path.exists(agent_dir):
            return {
                'success': False,
                'pid': None,
                'message': f'Agent directory not found for {agent_name}'
            }

        # Check if already running
        status = check_agent_process_running(agent_name, agent_dir)
        if status.get('running'):
            return {
                'success': True,
                'pid': status.get('pid'),
                'message': f'Agent is already running (PID: {status.get("pid")})'
            }

        # Check for main.py or agent.py
        main_py = os.path.join(agent_dir, 'main.py')
        agent_py = os.path.join(agent_dir, 'agent.py')

        if os.path.exists(main_py):
            script_file = main_py
        elif os.path.exists(agent_py):
            script_file = agent_py
        else:
            return {
                'success': False,
                'pid': None,
                'message': 'No main.py or agent.py found in agent directory'
            }

        # Start the agent process with proper detachment
        log_file = os.path.join(agent_dir, 'agent.log')

        # Open log file for writing
        log_fd = open(log_file, 'a')

        # Use subprocess.Popen for better control
        # The process will be detached from Flask and continue running independently
        proc = subprocess.Popen(
            ['python3', script_file, 'start'],
            cwd=agent_dir,
            stdout=log_fd,
            stderr=subprocess.STDOUT,
            start_new_session=True,  # Detach from parent process session
            close_fds=True  # Close all file descriptors
        )

        logger.info(f"Started agent process with PID: {proc.pid}")

        # Wait a moment for process to initialize
        import time
        time.sleep(2)

        # Verify it started and is still running
        status = check_agent_process_running(agent_name, agent_dir)
        if status.get('running'):
            return {
                'success': True,
                'pid': status.get('pid'),
                'message': f'Agent started successfully (PID: {status.get("pid")})'
            }
        else:
            # Check if the process we started is still alive
            try:
                proc_status = psutil.Process(proc.pid)
                if proc_status.is_running():
                    return {
                        'success': True,
                        'pid': proc.pid,
                        'message': f'Agent started (PID: {proc.pid})'
                    }
            except psutil.NoSuchProcess:
                pass

            return {
                'success': False,
                'pid': None,
                'message': f'Agent process failed to start. Check {log_file} for details.'
            }

    except Exception as e:
        logger.error(f"Error starting agent process: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'pid': None,
            'message': f'Error starting agent: {str(e)}'
        }

def stop_agent_process(agent_id: str, agent_name: str, agent_dir: str = None) -> Dict:
    """
    Stop an agent process and ALL its children

    Args:
        agent_id: Agent UUID
        agent_name: Agent name
        agent_dir: Optional agent directory path (will be auto-detected if not provided)

    Returns:
        {
            'success': True/False,
            'message': 'Stopped successfully' or error message
        }
    """
    try:
        # Get agent directory if not provided
        if not agent_dir:
            agent_dir = get_agent_directory(agent_id, agent_name)

        # Check if agent is running
        status = check_agent_process_running(agent_name, agent_dir)
        if not status.get('running'):
            return {
                'success': True,
                'message': 'Agent is not running'
            }

        pid = status.get('pid')
        if not pid:
            return {
                'success': False,
                'message': 'Could not find agent process ID'
            }

        # Kill the entire process tree (parent + all children)
        try:
            parent = psutil.Process(pid)

            # Get ALL children recursively
            children = parent.children(recursive=True)

            logger.info(f"Stopping agent PID {pid} with {len(children)} child processes")

            # Step 1: Send SIGTERM to all children first (graceful shutdown)
            for child in children:
                try:
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass

            # Step 2: Terminate parent
            parent.terminate()

            # Step 3: Wait up to 5 seconds for graceful shutdown
            all_procs = children + [parent]
            gone, alive = psutil.wait_procs(all_procs, timeout=5)

            # Step 4: Force kill any processes that didn't terminate gracefully
            if alive:
                logger.warning(f"Force killing {len(alive)} processes that didn't terminate gracefully")
                for p in alive:
                    try:
                        p.kill()
                    except psutil.NoSuchProcess:
                        pass

            return {
                'success': True,
                'message': f'Agent stopped successfully (killed {len(all_procs)} processes, PID: {pid})'
            }

        except psutil.NoSuchProcess:
            return {
                'success': True,
                'message': 'Agent process already stopped'
            }

    except Exception as e:
        logger.error(f"Error stopping agent process: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': f'Error stopping agent: {str(e)}'
        }

def calculate_call_readiness(sip_trunk_status: Dict, agent_status: Dict) -> Dict:
    """
    Calculate overall call readiness based on SIP trunk and agent status

    Args:
        sip_trunk_status: SIP trunk status dict
        agent_status: Agent status dict

    Returns:
        {
            'ready': True/False,
            'status': 'ready' | 'not_ready' | 'provisioning',
            'blocking_issues': [],
            'warnings': []
        }
    """
    blocking_issues = []
    warnings = []

    # Check SIP trunk
    sip_status = sip_trunk_status.get('status', 'error')
    if sip_status == 'provisioning':
        return {
            'ready': False,
            'status': 'provisioning',
            'blocking_issues': ['SIP trunk is being provisioned (10-15 seconds)'],
            'warnings': warnings,
            'message': 'SIP trunk is being set up. Please wait 10-15 seconds.'
        }
    elif sip_status == 'not_registered':
        blocking_issues.append('SIP trunk not registered with EPIC Voice')
    elif sip_status == 'error':
        blocking_issues.append('SIP trunk configuration error')

    # Check agent
    if not agent_status.get('running', False):
        blocking_issues.append('Agent process is not running')

    # Check for warnings
    if sip_trunk_status.get('health_score', 100) < 80:
        warnings.append(f"SIP trunk health score is low: {sip_trunk_status.get('health_score')}/100")

    latency = sip_trunk_status.get('magnus', {}).get('latency_ms')
    if latency and latency > 200:
        warnings.append(f"High SIP latency: {latency}ms")

    # Determine overall status
    if not blocking_issues:
        status = 'ready'
        ready = True
        message = 'Agent is ready to receive calls'
    else:
        status = 'not_ready'
        ready = False
        message = f"{len(blocking_issues)} issue(s) preventing calls"

    return {
        'ready': ready,
        'status': status,
        'blocking_issues': blocking_issues,
        'warnings': warnings,
        'message': message
    }
