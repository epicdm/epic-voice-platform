"""
SIP Configuration API endpoints for the user dashboard.
"""
import os
import uuid
from flask import request, jsonify
from database import SessionLocal, SIPConfig

def setup_sip_endpoints(app):
    """Set up SIP API endpoints for the Flask app."""

    def get_current_user_id():
        """Get current user ID - imported from user_dashboard.py."""
        if hasattr(app, 'get_current_user_id'):
            return app.get_current_user_id()
        
        # Fallback implementation
        from flask import session
        if 'user_id' in session:
            return session['user_id']
        
        # For testing: use first user
        db = SessionLocal()
        user = db.query(User).first()
        db.close()
        return user.id if user else None

    @app.route('/api/user/sip/configs', methods=['GET'])
    def get_sip_configs():
        """Get all SIP configurations for current user."""
        user_id = get_current_user_id()
        if not user_id:
            return jsonify([])

        db = SessionLocal()
        try:
            # Check for default filter
            default_only = request.args.get('default', '').lower() == 'true'
            
            if default_only:
                configs = db.query(SIPConfig).filter(
                    SIPConfig.user_id == user_id,
                    SIPConfig.is_default == True
                ).all()
            else:
                configs = db.query(SIPConfig).filter(
                    SIPConfig.user_id == user_id
                ).all()
                
            result = []
            for config in configs:
                result.append({
                    'id': config.id,
                    'name': config.name,
                    'sip_url': config.sip_url,
                    'sip_username': config.sip_username,
                    # Don't return passwords
                    'sip_transport': config.sip_transport,
                    'trunk_id': config.trunk_id,
                    'is_default': config.is_default,
                    'inbound_enabled': config.inbound_enabled,
                    'outbound_enabled': config.outbound_enabled,
                    'created_at': config.created_at.isoformat(),
                    'updated_at': config.updated_at.isoformat() if config.updated_at else None
                })
                
            return jsonify(result)
        finally:
            db.close()

    @app.route('/api/user/sip/configs/<config_id>', methods=['GET'])
    def get_sip_config(config_id):
        """Get a specific SIP configuration."""
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404
            
        db = SessionLocal()
        try:
            config = db.query(SIPConfig).filter(
                SIPConfig.id == config_id,
                SIPConfig.user_id == user_id
            ).first()
            
            if not config:
                return jsonify({'error': 'SIP configuration not found'}), 404
                
            result = {
                'id': config.id,
                'name': config.name,
                'sip_url': config.sip_url,
                'sip_username': config.sip_username,
                # Don't return passwords
                'sip_transport': config.sip_transport,
                'trunk_id': config.trunk_id,
                'is_default': config.is_default,
                'inbound_enabled': config.inbound_enabled,
                'outbound_enabled': config.outbound_enabled,
                'created_at': config.created_at.isoformat(),
                'updated_at': config.updated_at.isoformat() if config.updated_at else None
            }
            
            return jsonify(result)
        finally:
            db.close()

    @app.route('/api/user/sip/configs', methods=['POST'])
    def create_sip_config():
        """Create a new SIP configuration."""
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404
            
        data = request.json
        if not data.get('name') or not data.get('sip_url'):
            return jsonify({'error': 'Name and SIP URL are required'}), 400
            
        db = SessionLocal()
        try:
            # Check if this is set as default and update other configs
            is_default = data.get('is_default', False)
            if is_default:
                # Set all existing configs to non-default
                db.query(SIPConfig).filter(
                    SIPConfig.user_id == user_id,
                    SIPConfig.is_default == True
                ).update({'is_default': False})
                
            # Create new config
            config = SIPConfig(
                id=str(uuid.uuid4()),
                user_id=user_id,
                name=data.get('name'),
                sip_url=data.get('sip_url'),
                sip_username=data.get('sip_username'),
                sip_password=data.get('sip_password'),
                sip_transport=data.get('sip_transport', 'tcp'),
                trunk_id=data.get('trunk_id'),
                is_default=is_default,
                inbound_enabled=data.get('inbound_enabled', True),
                outbound_enabled=data.get('outbound_enabled', True)
            )
            
            db.add(config)
            db.commit()
            
            return jsonify({
                'success': True,
                'id': config.id,
                'name': config.name
            })
        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/user/sip/configs/<config_id>', methods=['PUT'])
    def update_sip_config(config_id):
        """Update a SIP configuration."""
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404
            
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        db = SessionLocal()
        try:
            config = db.query(SIPConfig).filter(
                SIPConfig.id == config_id,
                SIPConfig.user_id == user_id
            ).first()
            
            if not config:
                return jsonify({'error': 'SIP configuration not found'}), 404
                
            # Update fields if provided
            if 'name' in data:
                config.name = data['name']
            if 'sip_url' in data:
                config.sip_url = data['sip_url']
            if 'sip_username' in data:
                config.sip_username = data['sip_username']
            if 'sip_password' in data and data['sip_password']:
                config.sip_password = data['sip_password']
            if 'sip_transport' in data:
                config.sip_transport = data['sip_transport']
            if 'trunk_id' in data:
                config.trunk_id = data['trunk_id']
            if 'inbound_enabled' in data:
                config.inbound_enabled = data['inbound_enabled']
            if 'outbound_enabled' in data:
                config.outbound_enabled = data['outbound_enabled']
                
            # Handle default status
            if 'is_default' in data and data['is_default'] and not config.is_default:
                # Set all existing configs to non-default
                db.query(SIPConfig).filter(
                    SIPConfig.user_id == user_id,
                    SIPConfig.is_default == True
                ).update({'is_default': False})
                config.is_default = True
                
            db.commit()
            
            return jsonify({
                'success': True,
                'id': config.id,
                'name': config.name
            })
        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/user/sip/configs/<config_id>', methods=['DELETE'])
    def delete_sip_config(config_id):
        """Delete a SIP configuration."""
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'No user found'}), 404
            
        db = SessionLocal()
        try:
            config = db.query(SIPConfig).filter(
                SIPConfig.id == config_id,
                SIPConfig.user_id == user_id
            ).first()
            
            if not config:
                return jsonify({'error': 'SIP configuration not found'}), 404
                
            # Check if in use by phone mappings
            phone_count = db.query(PhoneMapping).filter(
                PhoneMapping.sip_config_id == config_id
            ).count()
            
            if phone_count > 0:
                return jsonify({
                    'error': 'Cannot delete SIP configuration in use by phone numbers',
                    'count': phone_count
                }), 400
                
            # Delete the configuration
            db.delete(config)
            db.commit()
            
            return jsonify({'success': True})
        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    return app
