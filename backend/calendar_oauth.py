"""
Calendar OAuth Integration - Allow users to connect their own calendars
Supports Google Calendar, Microsoft Outlook, and Calendly
"""

from flask import Blueprint, request, jsonify, redirect, session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
import json
from database import SessionLocal
from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

calendar_oauth_bp = Blueprint('calendar_oauth', __name__, url_prefix='/api/user/calendar')

# Database model for calendar connections
Base = declarative_base()

class CalendarConnection(Base):
    """Store user calendar OAuth credentials"""
    __tablename__ = 'calendar_connections'

    id = Column(PGUUID, primary_key=True, server_default='gen_random_uuid()')
    userid = Column(String, nullable=False)
    provider = Column(String(50), nullable=False)  # 'google', 'microsoft', 'calendly'
    calendar_email = Column(String(255))
    credentials = Column(Text)  # Encrypted JSON
    calendar_id = Column(String(255))  # Primary calendar ID
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Google Calendar OAuth Configuration
GOOGLE_CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv('GOOGLE_OAUTH_CLIENT_ID'),
        "client_secret": os.getenv('GOOGLE_OAUTH_CLIENT_SECRET'),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [os.getenv('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:5001/api/user/calendar/google/callback')]
    }
}

SCOPES = ['https://www.googleapis.com/auth/calendar']


@calendar_oauth_bp.route('/connect/google', methods=['GET'])
def connect_google_calendar():
    """
    Start Google Calendar OAuth flow

    Usage:
        GET /api/user/calendar/connect/google
        Headers: X-User-Email: user@example.com

    Response:
        Redirects to Google OAuth consent screen
    """
    try:
        user_email = request.headers.get('X-User-Email')
        if not user_email:
            return jsonify({'error': 'X-User-Email header required'}), 400

        # Store user email in session for callback
        session['user_email'] = user_email

        # Create OAuth flow
        flow = Flow.from_client_config(
            GOOGLE_CLIENT_CONFIG,
            scopes=SCOPES,
            redirect_uri=GOOGLE_CLIENT_CONFIG['web']['redirect_uris'][0]
        )

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )

        # Store state in session for security
        session['oauth_state'] = state

        return redirect(authorization_url)

    except Exception as e:
        logger.error(f"Error starting Google OAuth: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@calendar_oauth_bp.route('/google/callback', methods=['GET'])
def google_calendar_callback():
    """
    Handle Google Calendar OAuth callback

    This is called by Google after user authorizes access
    """
    try:
        # Verify state matches
        state = request.args.get('state')
        if state != session.get('oauth_state'):
            return jsonify({'error': 'Invalid state parameter'}), 400

        user_email = session.get('user_email')
        if not user_email:
            return jsonify({'error': 'Session expired'}), 400

        # Exchange authorization code for credentials
        flow = Flow.from_client_config(
            GOOGLE_CLIENT_CONFIG,
            scopes=SCOPES,
            state=state,
            redirect_uri=GOOGLE_CLIENT_CONFIG['web']['redirect_uris'][0]
        )

        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials

        # Get user's primary calendar
        service = build('calendar', 'v3', credentials=credentials)
        calendar_list = service.calendarList().list().execute()

        primary_calendar = None
        calendar_email = None
        for cal in calendar_list.get('items', []):
            if cal.get('primary'):
                primary_calendar = cal['id']
                calendar_email = cal['id']  # For Google, calendar ID is usually email
                break

        # Store credentials in database
        db = SessionLocal()
        try:
            # Query users table directly
            from sqlalchemy import text
            result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": user_email}).fetchone()

            if not result:
                return jsonify({'error': 'User not found'}), 404

            user_id = result[0]

            # Check if connection already exists
            existing = db.query(CalendarConnection).filter(
                CalendarConnection.userid == user_id,
                CalendarConnection.provider == 'google'
            ).first()

            credentials_json = {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            }

            if existing:
                # Update existing connection
                existing.credentials = json.dumps(credentials_json)
                existing.calendar_id = primary_calendar
                existing.calendar_email = calendar_email
                existing.is_active = True
                existing.updated_at = datetime.utcnow()
            else:
                # Create new connection
                connection = CalendarConnection(
                    userid=user_id,
                    provider='google',
                    calendar_email=calendar_email,
                    credentials=json.dumps(credentials_json),
                    calendar_id=primary_calendar,
                    is_active=True
                )
                db.add(connection)

            db.commit()

            # Redirect to success page
            return redirect('/dashboard/settings?calendar_connected=true')

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error in Google OAuth callback: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@calendar_oauth_bp.route('/connections', methods=['GET'])
def get_calendar_connections():
    """
    Get user's connected calendars

    GET /api/user/calendar/connections
    Headers: X-User-Email: user@example.com

    Response:
        {
            "success": true,
            "calendars": [
                {
                    "provider": "google",
                    "calendar_email": "user@gmail.com",
                    "calendar_id": "primary",
                    "is_active": true,
                    "connected_at": "2025-11-20T..."
                }
            ]
        }
    """
    try:
        user_email = request.headers.get('X-User-Email')
        if not user_email:
            return jsonify({'error': 'X-User-Email header required'}), 400

        db = SessionLocal()
        try:
            from sqlalchemy import text
            result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": user_email}).fetchone()

            if not result:
                return jsonify({'error': 'User not found'}), 404

            user_id = result[0]

            connections = db.query(CalendarConnection).filter(
                CalendarConnection.userid == user_id,
                CalendarConnection.is_active == True
            ).all()

            calendars = []
            for conn in connections:
                calendars.append({
                    'provider': conn.provider,
                    'calendar_email': conn.calendar_email,
                    'calendar_id': conn.calendar_id,
                    'is_active': conn.is_active,
                    'connected_at': conn.created_at.isoformat()
                })

            return jsonify({
                'success': True,
                'calendars': calendars
            })

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error getting calendar connections: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@calendar_oauth_bp.route('/disconnect/<provider>', methods=['DELETE'])
def disconnect_calendar(provider):
    """
    Disconnect a calendar

    DELETE /api/user/calendar/disconnect/google
    Headers: X-User-Email: user@example.com
    """
    try:
        user_email = request.headers.get('X-User-Email')
        if not user_email:
            return jsonify({'error': 'X-User-Email header required'}), 400

        db = SessionLocal()
        try:
            from sqlalchemy import text
            result = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": user_email}).fetchone()

            if not result:
                return jsonify({'error': 'User not found'}), 404

            user_id = result[0]

            connection = db.query(CalendarConnection).filter(
                CalendarConnection.userid == user_id,
                CalendarConnection.provider == provider
            ).first()

            if not connection:
                return jsonify({'error': 'Calendar not connected'}), 404

            connection.is_active = False
            connection.updated_at = datetime.utcnow()
            db.commit()

            return jsonify({
                'success': True,
                'message': f'{provider} calendar disconnected'
            })

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error disconnecting calendar: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def get_user_calendar_credentials(user_id, provider='google'):
    """
    Helper function to get user's calendar credentials

    Args:
        user_id: User UUID
        provider: Calendar provider (google, microsoft, calendly)

    Returns:
        dict with credentials or None
    """
    db = SessionLocal()
    try:
        connection = db.query(CalendarConnection).filter(
            CalendarConnection.userid == user_id,
            CalendarConnection.provider == provider,
            CalendarConnection.is_active == True
        ).first()

        if not connection:
            return None

        credentials_dict = json.loads(connection.credentials)
        return {
            'credentials': credentials_dict,
            'calendar_id': connection.calendar_id,
            'calendar_email': connection.calendar_email
        }

    finally:
        db.close()
