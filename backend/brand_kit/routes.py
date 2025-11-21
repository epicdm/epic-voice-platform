"""
Brand Kit API Routes
RESTful endpoints for managing brand kits
"""

import logging
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from database import SessionLocal
from backend.brand_kit.service import BrandKitService

logger = logging.getLogger(__name__)

brand_kit_api = Blueprint('brand_kit_api', __name__, url_prefix='/api/user/brand-kits')
service = BrandKitService()


def get_current_user_id():
    """Get current user ID from request headers or session."""
    from flask import session
    from database import User

    # Check Flask session first
    if 'user_id' in session:
        return session['user_id']

    # Check Authorization header
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.replace('Bearer ', '')
        try:
            import jwt
            from flask import current_app
            decoded = jwt.decode(token, current_app.secret_key, algorithms=['HS256'])
            return decoded.get('user_id')
        except:
            pass

    # Check for user_id in cookies
    user_id_cookie = request.cookies.get('user_id')
    if user_id_cookie:
        return user_id_cookie

    # Check for email in headers and look up user
    user_email = request.headers.get('X-User-Email')
    if user_email:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == user_email).first()

            # Auto-create user if they don't exist
            if not user:
                import uuid
                from werkzeug.security import generate_password_hash

                user = User(
                    id=str(uuid.uuid4()),
                    email=user_email,
                    name=user_email.split('@')[0].title(),
                    password=generate_password_hash(str(uuid.uuid4())),
                    isActive=True
                )
                db.add(user)
                db.commit()

            return user.id
        finally:
            db.close()

    return None


@brand_kit_api.route('', methods=['GET'])
@cross_origin()
def list_brand_kits():
    """
    List all brand kits for the current user.

    GET /api/user/brand-kits

    Returns:
        {
            "success": true,
            "data": [
                {
                    "id": "uuid",
                    "name": "My Brand",
                    "isDefault": true,
                    "logoUrl": "https://...",
                    "brandColors": [...],
                    ...
                }
            ],
            "count": 3
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    try:
        brand_kits = service.list_brand_kits(db, user_id)

        return jsonify({
            'success': True,
            'data': [kit.to_dict() for kit in brand_kits],
            'count': len(brand_kits)
        })

    except Exception as e:
        logger.error(f"Error listing brand kits: {e}")
        return jsonify({'error': 'Failed to list brand kits'}), 500
    finally:
        db.close()


@brand_kit_api.route('/<brand_kit_id>', methods=['GET'])
@cross_origin()
def get_brand_kit(brand_kit_id: str):
    """
    Get a specific brand kit.

    GET /api/user/brand-kits/{id}

    Returns:
        {
            "success": true,
            "data": {
                "id": "uuid",
                "name": "My Brand",
                ...
            }
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    try:
        brand_kit = service.get_brand_kit(db, brand_kit_id, user_id)

        if not brand_kit:
            return jsonify({'error': 'Brand kit not found'}), 404

        return jsonify({
            'success': True,
            'data': brand_kit.to_dict()
        })

    except Exception as e:
        logger.error(f"Error getting brand kit: {e}")
        return jsonify({'error': 'Failed to get brand kit'}), 500
    finally:
        db.close()


@brand_kit_api.route('/default', methods=['GET'])
@cross_origin()
def get_default_brand_kit():
    """
    Get user's default brand kit.

    GET /api/user/brand-kits/default

    Returns:
        {
            "success": true,
            "data": {...} or null
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    try:
        brand_kit = service.get_default_brand_kit(db, user_id)

        return jsonify({
            'success': True,
            'data': brand_kit.to_dict() if brand_kit else None
        })

    except Exception as e:
        logger.error(f"Error getting default brand kit: {e}")
        return jsonify({'error': 'Failed to get default brand kit'}), 500
    finally:
        db.close()


@brand_kit_api.route('', methods=['POST'])
@cross_origin()
def create_brand_kit():
    """
    Create a new brand kit.

    POST /api/user/brand-kits
    Body:
        {
            "name": "My Brand",
            "sourceType": "manual",
            "logoUrl": "https://...",
            "brandColors": [...],
            "isDefault": false
        }

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400

    db = SessionLocal()
    try:
        brand_kit = service.create_brand_kit(
            db,
            user_id=user_id,
            name=data['name'],
            source_type=data.get('sourceType', 'manual'),
            source_url=data.get('sourceUrl'),
            is_default=data.get('isDefault', False),
            logoUrl=data.get('logoUrl'),
            logoSvg=data.get('logoSvg'),
            brandColors=data.get('brandColors', []),
            fonts=data.get('fonts', []),
            companyName=data.get('companyName'),
            tagline=data.get('tagline'),
            industry=data.get('industry'),
            description=data.get('description'),
            phone=data.get('phone'),
            email=data.get('email'),
            websiteUrl=data.get('websiteUrl'),
            socialLinks=data.get('socialLinks', {})
        )

        return jsonify({
            'success': True,
            'data': brand_kit.to_dict()
        }), 201

    except Exception as e:
        logger.error(f"Error creating brand kit: {e}")
        return jsonify({'error': 'Failed to create brand kit'}), 500
    finally:
        db.close()


@brand_kit_api.route('/extract', methods=['POST'])
@cross_origin()
def extract_brand_kit():
    """
    Extract brand kit from a website URL.

    POST /api/user/brand-kits/extract
    Body:
        {
            "url": "https://example.com",
            "name": "Example Brand" (optional),
            "isDefault": false (optional)
        }

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({
            'success': False,
            'error': {
                'message': 'Authentication required',
                'code': 'UNAUTHORIZED'
            }
        }), 401

    data = request.json
    if not data or not data.get('url'):
        return jsonify({
            'success': False,
            'error': {
                'message': 'URL is required',
                'code': 'MISSING_URL'
            }
        }), 400

    db = SessionLocal()
    try:
        brand_kit = service.extract_from_website(
            db,
            user_id=user_id,
            website_url=data['url'],
            name=data.get('name'),
            is_default=data.get('isDefault', False)
        )

        if not brand_kit:
            return jsonify({
                'success': False,
                'error': {
                    'message': 'Could not fetch brand data from the provided URL',
                    'code': 'EXTRACTION_FAILED'
                }
            }), 400

        return jsonify({
            'success': True,
            'data': brand_kit.to_dict()
        }), 201

    except ValueError as ve:
        # Validation error with helpful message (e.g., social media profile URL)
        logger.warning(f"Validation error extracting brand kit: {ve}")
        return jsonify({
            'success': False,
            'error': {
                'message': str(ve),
                'code': 'VALIDATION_ERROR'
            }
        }), 400
    except Exception as e:
        logger.error(f"Error extracting brand kit: {e}")

        # Check for duplicate name error
        if 'unique_user_brand_name' in str(e):
            return jsonify({
                'success': False,
                'error': {
                    'message': 'A brand kit with this name already exists. Please choose a different name.',
                    'code': 'DUPLICATE_NAME'
                }
            }), 400

        return jsonify({
            'success': False,
            'error': {
                'message': 'Failed to extract brand kit. Please try again.',
                'code': 'EXTRACTION_ERROR'
            }
        }), 500
    finally:
        db.close()


@brand_kit_api.route('/<brand_kit_id>', methods=['PUT', 'PATCH'])
@cross_origin()
def update_brand_kit(brand_kit_id: str):
    """
    Update a brand kit.

    PUT/PATCH /api/user/brand-kits/{id}
    Body:
        {
            "name": "Updated Name",
            "logoUrl": "https://...",
            ...
        }

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    db = SessionLocal()
    try:
        brand_kit = service.update_brand_kit(db, brand_kit_id, user_id, **data)

        if not brand_kit:
            return jsonify({'error': 'Brand kit not found'}), 404

        return jsonify({
            'success': True,
            'data': brand_kit.to_dict()
        })

    except Exception as e:
        logger.error(f"Error updating brand kit: {e}")
        return jsonify({'error': 'Failed to update brand kit'}), 500
    finally:
        db.close()


@brand_kit_api.route('/<brand_kit_id>/set-default', methods=['POST'])
@cross_origin()
def set_default(brand_kit_id: str):
    """
    Set a brand kit as the default.

    POST /api/user/brand-kits/{id}/set-default

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    try:
        brand_kit = service.set_default_brand_kit(db, brand_kit_id, user_id)

        if not brand_kit:
            return jsonify({'error': 'Brand kit not found'}), 404

        return jsonify({
            'success': True,
            'data': brand_kit.to_dict()
        })

    except Exception as e:
        logger.error(f"Error setting default brand kit: {e}")
        return jsonify({'error': 'Failed to set default brand kit'}), 500
    finally:
        db.close()


@brand_kit_api.route('/<brand_kit_id>/refresh', methods=['POST'])
@cross_origin()
def refresh_brand_kit(brand_kit_id: str):
    """
    Re-extract brand information from source URL.

    POST /api/user/brand-kits/{id}/refresh

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    try:
        brand_kit = service.refresh_brand_kit(db, brand_kit_id, user_id)

        if not brand_kit:
            return jsonify({'error': 'Brand kit not found'}), 404

        return jsonify({
            'success': True,
            'data': brand_kit.to_dict()
        })

    except Exception as e:
        logger.error(f"Error refreshing brand kit: {e}")
        return jsonify({'error': 'Failed to refresh brand kit'}), 500
    finally:
        db.close()


@brand_kit_api.route('/<brand_kit_id>', methods=['DELETE'])
@cross_origin()
def delete_brand_kit(brand_kit_id: str):
    """
    Delete a brand kit.

    DELETE /api/user/brand-kits/{id}

    Returns:
        {
            "success": true,
            "message": "Brand kit deleted"
        }
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Authentication required'}), 401

    db = SessionLocal()
    try:
        success = service.delete_brand_kit(db, brand_kit_id, user_id)

        if not success:
            return jsonify({'error': 'Brand kit not found'}), 404

        return jsonify({
            'success': True,
            'message': 'Brand kit deleted successfully'
        })

    except Exception as e:
        logger.error(f"Error deleting brand kit: {e}")
        return jsonify({'error': 'Failed to delete brand kit'}), 500
    finally:
        db.close()
