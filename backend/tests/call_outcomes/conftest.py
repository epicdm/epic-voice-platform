"""
Pytest configuration and fixtures for call outcomes tests.

Provides:
- Database session fixtures with transaction rollback
- Test user and agent config fixtures
- Mock webhook event fixtures
- Multi-tenant test data
"""

import pytest
import uuid
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

from database import Base, User, AgentConfig
from backend.call_outcomes.models import CallLog, LiveKitCallEvent


# Test database URL (use test database to avoid polluting production data)
TEST_DATABASE_URL = os.getenv('TEST_DATABASE_URL', 'postgresql://postgres:nXrRje4emjejjeKI009p@localhost:5432/epic_voice_test_db')


@pytest.fixture(scope='session')
def engine():
    """
    Create test database engine (session-scoped).

    Creates test database and tables once per test session.
    """
    # Create test engine
    test_engine = create_engine(TEST_DATABASE_URL)

    # Create all tables
    Base.metadata.create_all(bind=test_engine)

    yield test_engine

    # Cleanup: drop all tables after test session
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture(scope='function')
def db_session(engine):
    """
    Create database session with automatic rollback (function-scoped).

    Each test gets a clean database state via transaction rollback.
    This ensures test isolation without slow table truncation.
    """
    # Create connection and begin transaction
    connection = engine.connect()
    transaction = connection.begin()

    # Create session bound to connection
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    # Rollback transaction (undoes all test changes)
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def test_user(db_session):
    """
    Create test user (user_1).

    Returns:
        User object with id='user_1'
    """
    user = User(
        id='user_1',
        email='test@example.com',
        name='Test User',
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow(),
        isActive=True,
        onboardingCompleted=True
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_user_2(db_session):
    """
    Create second test user (user_2) for multi-tenant tests.

    Returns:
        User object with id='user_2'
    """
    user = User(
        id='user_2',
        email='test2@example.com',
        name='Test User 2',
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow(),
        isActive=True,
        onboardingCompleted=True
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_agent_config(db_session, test_user):
    """
    Create test agent configuration.

    Returns:
        AgentConfig object linked to test_user
    """
    agent = AgentConfig(
        id='agent_1',
        userId=test_user.id,
        agentId='test_agent',
        name='Test Agent',
        description='Test agent for testing',
        instructions='You are a helpful assistant',
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow(),
        isActive=True,
        llmModel='gpt-4o-mini',
        voice='alloy'
    )
    db_session.add(agent)
    db_session.commit()
    return agent


@pytest.fixture
def test_call_log(db_session, test_user, test_agent_config):
    """
    Create test call log.

    Returns:
        CallLog object with active status
    """
    call_log = CallLog(
        id='call_1',
        userId=test_user.id,
        agentConfigId=test_agent_config.id,
        livekitRoomName='sip-call__17678189426_test123',  # Production-style room naming
        livekitRoomSid='RM_test123',
        direction='inbound',
        phoneNumber='+17678189426',
        sipCallId='sip-call-123',
        status='active',
        startedAt=datetime.utcnow(),
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    db_session.add(call_log)
    db_session.commit()
    return call_log


@pytest.fixture
def test_call_log_user_2(db_session, test_user_2):
    """
    Create test call log for user_2 (multi-tenant testing).

    Returns:
        CallLog object linked to test_user_2
    """
    call_log = CallLog(
        id='call_2',
        userId=test_user_2.id,
        livekitRoomName='sip-call__15551234567_test456',  # Production-style room naming
        livekitRoomSid='RM_test456',
        direction='inbound',
        phoneNumber='+15551234567',
        status='active',
        startedAt=datetime.utcnow(),
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    db_session.add(call_log)
    db_session.commit()
    return call_log


@pytest.fixture
def mock_webhook_event():
    """
    Create mock LiveKit webhook event (participant_left).

    Returns:
        Dict with normalized webhook event structure
    """
    event_id = f'evt_{uuid.uuid4().hex[:12]}'
    room_creation = datetime.utcnow() - timedelta(seconds=45)
    event_created = datetime.utcnow()

    return {
        'event_id': event_id,
        'event_type': 'participant_left',
        'room_name': 'sip-call__17678189426_test123',  # Match production-style naming
        'room_sid': 'RM_test123',
        'room_creation_time': room_creation.isoformat() + 'Z',
        'participant_sid': 'PA_agent123',
        'participant_identity': 'agent',
        'disconnect_reason': 'CLIENT_INITIATED',
        'recording_url': None,
        'created_at': event_created.isoformat() + 'Z',
        'raw_payload': {
            'id': event_id,
            'event': 'participant_left',
            'room': {
                'name': 'sip-call__17678189426_test123',
                'sid': 'RM_test123',
                'creationTime': room_creation.isoformat() + 'Z'
            },
            'participant': {
                'sid': 'PA_agent123',
                'identity': 'agent',
                'disconnectReason': 'CLIENT_INITIATED'
            },
            'createdAt': event_created.isoformat() + 'Z'
        }
    }


@pytest.fixture
def mock_webhook_payload():
    """
    Create mock LiveKit webhook payload (raw from LiveKit).

    Returns:
        Dict with raw LiveKit webhook structure
    """
    event_id = f'evt_{uuid.uuid4().hex[:12]}'
    room_creation = datetime.utcnow() - timedelta(seconds=45)
    event_created = datetime.utcnow()

    return {
        'id': event_id,
        'event': 'participant_left',
        'createdAt': event_created.isoformat() + 'Z',
        'room': {
            'name': 'sip-7678189426__1730000000__abc123',
            'sid': 'RM_test123',
            'creationTime': room_creation.isoformat() + 'Z'
        },
        'participant': {
            'sid': 'PA_agent123',
            'identity': 'agent',
            'disconnectReason': 'CLIENT_INITIATED'
        }
    }


@pytest.fixture
def mock_short_call_event():
    """
    Create mock event for short call (no_answer outcome).

    Returns:
        Dict with normalized event for 5-second call
    """
    event_id = f'evt_{uuid.uuid4().hex[:12]}'
    room_creation = datetime.utcnow() - timedelta(seconds=5)
    event_created = datetime.utcnow()

    return {
        'event_id': event_id,
        'event_type': 'participant_left',
        'room_name': 'test-room-short',
        'room_sid': 'RM_short',
        'room_creation_time': room_creation.isoformat() + 'Z',
        'participant_sid': 'PA_agent456',
        'participant_identity': 'agent',
        'disconnect_reason': '',
        'recording_url': None,
        'created_at': event_created.isoformat() + 'Z',
        'raw_payload': {}
    }


@pytest.fixture
def mock_busy_event():
    """
    Create mock event for busy signal.

    Returns:
        Dict with normalized event for busy call
    """
    event_id = f'evt_{uuid.uuid4().hex[:12]}'
    room_creation = datetime.utcnow() - timedelta(seconds=2)
    event_created = datetime.utcnow()

    return {
        'event_id': event_id,
        'event_type': 'participant_left',
        'room_name': 'test-room-busy',
        'room_sid': 'RM_busy',
        'room_creation_time': room_creation.isoformat() + 'Z',
        'participant_sid': 'PA_agent789',
        'participant_identity': 'agent',
        'disconnect_reason': 'BUSY',
        'recording_url': None,
        'created_at': event_created.isoformat() + 'Z',
        'raw_payload': {}
    }


@pytest.fixture
def livekit_webhook_secret():
    """
    Mock LiveKit webhook secret for signature validation.

    Returns:
        str: Test webhook secret
    """
    return 'test-webhook-secret-for-testing-only'


# Pytest configuration
def pytest_configure(config):
    """
    Configure pytest with custom markers.
    """
    config.addinivalue_line(
        "markers", "unit: Unit tests (fast, no external dependencies)"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests (database required)"
    )
    config.addinivalue_line(
        "markers", "idempotency: Idempotency verification tests"
    )
    config.addinivalue_line(
        "markers", "multitenant: Multi-tenant isolation tests"
    )
