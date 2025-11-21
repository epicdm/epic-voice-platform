# Multi-Tenant Voice Agent Platform Architecture

## Overview

Architecture for allowing multiple users to create and manage their own voice agents through a GUI.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User Management GUI                       │
│  (Web Dashboard where users configure their agents)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Configuration Database                      │
│  - User accounts                                            │
│  - Agent configurations (per user)                          │
│  - Phone numbers / SIP trunk mappings                       │
│  - Usage tracking & billing                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              LiveKit Agent Worker(s)                        │
│  - Loads config dynamically per call                        │
│  - Routes based on phone number or SIP trunk                │
│  - Applies user-specific instructions                       │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    created_at TIMESTAMP,
    subscription_plan VARCHAR(50)
);
```

### Agent Configurations Table
```sql
CREATE TABLE agent_configs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    instructions TEXT,  -- System prompt
    llm_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    voice VARCHAR(50) DEFAULT 'alloy',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    language VARCHAR(10) DEFAULT 'en-US',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Phone Number Mappings Table
```sql
CREATE TABLE phone_mappings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    agent_config_id UUID REFERENCES agent_configs(id),
    phone_number VARCHAR(20) UNIQUE,
    sip_trunk_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);
```

### Call Logs Table
```sql
CREATE TABLE call_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    agent_config_id UUID REFERENCES agent_configs(id),
    phone_number VARCHAR(20),
    duration_seconds INTEGER,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    cost DECIMAL(10,4)
);
```

## Agent Implementation

### Dynamic Configuration Loading

```python
# multi_tenant_agent.py
from livekit import agents
from livekit.agents import Agent, AgentSession
from livekit.plugins import openai, deepgram, silero
import psycopg2
import os

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    )

def get_user_config(phone_number):
    """Load user configuration based on incoming phone number."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            u.id as user_id,
            ac.instructions,
            ac.llm_model,
            ac.voice,
            ac.temperature,
            ac.language
        FROM phone_mappings pm
        JOIN users u ON pm.user_id = u.id
        JOIN agent_configs ac ON pm.agent_config_id = ac.id
        WHERE pm.phone_number = %s AND pm.is_active = true
    """, (phone_number,))
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    if result:
        return {
            'user_id': result[0],
            'instructions': result[1],
            'llm_model': result[2],
            'voice': result[3],
            'temperature': result[4],
            'language': result[5]
        }
    
    # Default fallback
    return {
        'user_id': None,
        'instructions': 'You are a helpful assistant.',
        'llm_model': 'gpt-4o-mini',
        'voice': 'alloy',
        'temperature': 0.7,
        'language': 'en-US'
    }

class DynamicAssistant(Agent):
    """Agent that adapts based on user configuration."""
    
    def __init__(self, instructions: str):
        super().__init__(instructions=instructions)

async def entrypoint(ctx: agents.JobContext):
    """Entry point with dynamic configuration."""
    
    # Extract phone number from room metadata or SIP participant
    phone_number = None
    for participant in ctx.room.remote_participants.values():
        if hasattr(participant, 'attributes'):
            phone_number = participant.attributes.get('phoneNumber')
            break
    
    # Load user-specific configuration
    config = get_user_config(phone_number)
    
    # Log the call start
    if config['user_id']:
        log_call_start(config['user_id'], phone_number, ctx.room.name)
    
    # Create session with user's configuration
    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language=config['language']),
        llm=openai.LLM(
            model=config['llm_model'],
            temperature=config['temperature']
        ),
        tts=openai.TTS(voice=config['voice']),
        vad=silero.VAD.load(),
    )
    
    # Start session with user's instructions
    await session.start(
        room=ctx.room,
        agent=DynamicAssistant(instructions=config['instructions'])
    )
    
    # Generate greeting
    await session.generate_reply(
        instructions="Greet the caller warmly."
    )

def log_call_start(user_id, phone_number, room_name):
    """Log call initiation for billing."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO call_logs (user_id, phone_number, room_name, started_at)
        VALUES (%s, %s, %s, NOW())
    """, (user_id, phone_number, room_name))
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
```

## User Dashboard Implementation

### Flask API for User Management

```python
# user_dashboard.py
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import uuid

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

@app.route('/api/user/agents', methods=['GET'])
def get_user_agents():
    """Get all agents for the logged-in user."""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, name, instructions, llm_model, voice, temperature
        FROM agent_configs
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))
    
    agents = []
    for row in cur.fetchall():
        agents.append({
            'id': row[0],
            'name': row[1],
            'instructions': row[2],
            'llm_model': row[3],
            'voice': row[4],
            'temperature': row[5]
        })
    
    cur.close()
    conn.close()
    return jsonify(agents)

@app.route('/api/user/agents', methods=['POST'])
def create_agent():
    """Create a new agent configuration."""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    user_id = session['user_id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    agent_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO agent_configs 
        (id, user_id, name, instructions, llm_model, voice, temperature, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
    """, (
        agent_id,
        user_id,
        data['name'],
        data['instructions'],
        data.get('llm_model', 'gpt-4o-mini'),
        data.get('voice', 'alloy'),
        data.get('temperature', 0.7)
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'success': True, 'agent_id': agent_id})

@app.route('/api/user/agents/<agent_id>', methods=['PUT'])
def update_agent(agent_id):
    """Update agent configuration."""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    user_id = session['user_id']
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        UPDATE agent_configs
        SET instructions = %s,
            llm_model = %s,
            voice = %s,
            temperature = %s,
            updated_at = NOW()
        WHERE id = %s AND user_id = %s
    """, (
        data['instructions'],
        data['llm_model'],
        data['voice'],
        data['temperature'],
        agent_id,
        user_id
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/user/phone-numbers', methods=['GET'])
def get_phone_numbers():
    """Get phone numbers assigned to user."""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT pm.phone_number, pm.sip_trunk_id, ac.name as agent_name
        FROM phone_mappings pm
        LEFT JOIN agent_configs ac ON pm.agent_config_id = ac.id
        WHERE pm.user_id = %s AND pm.is_active = true
    """, (user_id,))
    
    numbers = []
    for row in cur.fetchall():
        numbers.append({
            'phone_number': row[0],
            'sip_trunk_id': row[1],
            'agent_name': row[2]
        })
    
    cur.close()
    conn.close()
    return jsonify(numbers)
```

## Frontend User Dashboard (React Example)

```javascript
// AgentManager.jsx
import React, { useState, useEffect } from 'react';

export default function AgentManager() {
  const [agents, setAgents] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const response = await fetch('/api/user/agents');
    const data = await response.json();
    setAgents(data);
  };

  const createAgent = async (agentData) => {
    await fetch('/api/user/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData)
    });
    fetchAgents();
  };

  const updateAgent = async (agentId, agentData) => {
    await fetch(`/api/user/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agentData)
    });
    fetchAgents();
  };

  return (
    <div className="agent-manager">
      <h1>My Voice Agents</h1>
      
      <button onClick={() => setEditing({})}>
        Create New Agent
      </button>

      {agents.map(agent => (
        <div key={agent.id} className="agent-card">
          <h3>{agent.name}</h3>
          <p>Model: {agent.llm_model}</p>
          <p>Voice: {agent.voice}</p>
          <button onClick={() => setEditing(agent)}>Edit</button>
        </div>
      ))}

      {editing && (
        <AgentEditor
          agent={editing}
          onSave={(data) => {
            if (editing.id) {
              updateAgent(editing.id, data);
            } else {
              createAgent(data);
            }
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
```

## Deployment Considerations

### 1. **Database**
- PostgreSQL (recommended)
- MySQL
- MongoDB (for more flexibility)

### 2. **Scaling**
- Start with 1 agent worker
- Add more workers as user base grows
- Use LiveKit Cloud for auto-scaling

### 3. **Billing**
- Track call duration in database
- Calculate costs per user
- Implement usage limits

### 4. **Security**
- User authentication (JWT tokens)
- API rate limiting
- Input validation
- SQL injection prevention

### 5. **Phone Number Provisioning**
- Integrate with Twilio, Vonage, or other SIP providers
- Auto-provision numbers for users
- Map to LiveKit SIP trunks

## Next Steps

1. **Choose database** (PostgreSQL recommended)
2. **Set up user authentication**
3. **Create database schema**
4. **Build user dashboard API**
5. **Modify agent to load from database**
6. **Test with multiple users**
7. **Add billing/usage tracking**

## Cost Considerations

**Per-Call Costs:**
- OpenAI API (LLM): ~$0.01-0.05 per minute
- Deepgram STT: ~$0.0043 per minute
- OpenAI TTS: ~$0.015 per minute
- LiveKit (self-hosted): Free
- LiveKit Cloud: Variable

**Pricing Strategy:**
- Charge users per minute of usage
- Subscription tiers (# of calls, minutes)
- Mark up API costs 2-3x for profit

