#!/usr/bin/env python3
"""
Temporary API endpoint to run migration 010
Access via: curl https://epic-voice-platform.onrender.com/run-migration-010
"""

from flask import Flask, jsonify
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

app = Flask(__name__)

@app.route('/run-migration-010', methods=['GET', 'POST'])
def run_migration():
    """Run migration 010 to fix sip_extension VARCHAR length"""
    try:
        # Import and run the migration
        from backend.migrations.run_migration_010 import run_migration as execute_migration

        success = execute_migration()

        if success:
            return jsonify({
                'success': True,
                'message': 'Migration 010 completed successfully',
                'details': 'sip_extension column increased from VARCHAR(10) to VARCHAR(20)'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Migration failed - check server logs'
            }), 500

    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'message': f'Migration error: {str(e)}',
            'traceback': traceback.format_exc()
        }), 500

if __name__ == '__main__':
    # For testing only
    app.run(debug=True, port=5001)
