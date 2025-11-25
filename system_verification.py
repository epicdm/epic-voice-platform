#!/usr/bin/env python3
"""
Complete System Verification Script
Compares ai.epic.dm deployment with expected configuration
"""

import os
import sys
import json
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'=' * 80}{RESET}")
    print(f"{BLUE}{text:^80}{RESET}")
    print(f"{BLUE}{'=' * 80}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text):
    print(f"{RED}❌ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}⚠️  {text}{RESET}")

def print_info(text):
    print(f"{BLUE}ℹ️  {text}{RESET}")

issues_found = []
warnings_found = []

# ============================================================================
# 1. DATABASE SCHEMA VERIFICATION
# ============================================================================
def verify_database_schema():
    print_header("DATABASE SCHEMA VERIFICATION")

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print_error("DATABASE_URL not set")
        issues_found.append("DATABASE_URL environment variable not set")
        return

    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        # Check critical columns
        critical_checks = [
            {
                'table': 'agent_configs',
                'column': 'sip_extension',
                'expected_type': 'character varying',
                'expected_length': 20,
                'description': 'SIP extension field (must hold full phone numbers)'
            },
            {
                'table': 'agent_configs',
                'column': 'did_number',
                'expected_type': 'character varying',
                'expected_length': 20,
                'description': 'DID number field'
            },
            {
                'table': 'users',
                'column': 'email',
                'expected_type': 'character varying',
                'expected_length': 255,
                'description': 'User email field'
            },
        ]

        for check in critical_checks:
            cursor.execute("""
                SELECT data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
            """, (check['table'], check['column']))

            result = cursor.fetchone()
            if not result:
                print_error(f"{check['table']}.{check['column']} - MISSING")
                issues_found.append(f"Column {check['table']}.{check['column']} does not exist")
            else:
                data_type, max_length = result
                if data_type != check['expected_type']:
                    print_error(f"{check['table']}.{check['column']} - Type mismatch: {data_type} (expected {check['expected_type']})")
                    issues_found.append(f"{check['table']}.{check['column']} has wrong type")
                elif max_length != check['expected_length']:
                    print_error(f"{check['table']}.{check['column']} - Length mismatch: VARCHAR({max_length}) (expected VARCHAR({check['expected_length']}))")
                    issues_found.append(f"{check['table']}.{check['column']} has wrong length: {max_length} (expected {check['expected_length']})")
                else:
                    print_success(f"{check['table']}.{check['column']} - VARCHAR({max_length}) ✓")

        # Check table counts
        print_info("\nTable row counts:")
        tables = ['users', 'agent_configs', 'call_logs', 'phone_mappings', 'funnels']
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} rows")

        cursor.close()
        conn.close()

    except Exception as e:
        print_error(f"Database connection failed: {e}")
        issues_found.append(f"Database error: {e}")

# ============================================================================
# 2. ENVIRONMENT VARIABLES VERIFICATION
# ============================================================================
def verify_environment_variables():
    print_header("ENVIRONMENT VARIABLES VERIFICATION")

    required_vars = [
        ('DATABASE_URL', 'PostgreSQL connection string'),
        ('LIVEKIT_API_KEY', 'LiveKit API key'),
        ('LIVEKIT_API_SECRET', 'LiveKit API secret'),
        ('LIVEKIT_URL', 'LiveKit server URL'),
        ('MAGNUS_API_URL', 'Magnus Billing API URL'),
        ('MAGNUS_API_KEY', 'Magnus Billing API key'),
        ('OPENAI_API_KEY', 'OpenAI API key'),
    ]

    for var_name, description in required_vars:
        value = os.getenv(var_name)
        if not value:
            print_error(f"{var_name} - NOT SET ({description})")
            issues_found.append(f"Missing environment variable: {var_name}")
        elif value.startswith('your_') or value == 'changeme':
            print_warning(f"{var_name} - PLACEHOLDER VALUE")
            warnings_found.append(f"{var_name} has placeholder value")
        else:
            # Mask sensitive values
            masked = value[:8] + '...' if len(value) > 8 else '***'
            print_success(f"{var_name} - SET ({masked})")

# ============================================================================
# 3. FILE INTEGRITY CHECK
# ============================================================================
def verify_critical_files():
    print_header("CRITICAL FILES VERIFICATION")

    critical_files = [
        'user_dashboard.py',
        'database.py',
        'phone_number_manager.py',
        'livekit_telephony.py',
        'backend/migrations/migration_009_fusionpbx_integration.sql',
        'backend/migrations/migration_010_fix_sip_extension_length.sql',
    ]

    for file_path in critical_files:
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            print_success(f"{file_path} - EXISTS ({size} bytes)")
        else:
            print_error(f"{file_path} - MISSING")
            issues_found.append(f"Missing critical file: {file_path}")

# ============================================================================
# MAIN EXECUTION
# ============================================================================
if __name__ == '__main__':
    print_header("AI.EPIC.DM SYSTEM VERIFICATION")
    print_info("Checking system integrity and configuration...")

    verify_database_schema()
    verify_environment_variables()
    verify_critical_files()

    # Summary
    print_header("VERIFICATION SUMMARY")

    if issues_found:
        print_error(f"Found {len(issues_found)} critical issues:")
        for i, issue in enumerate(issues_found, 1):
            print(f"  {i}. {issue}")
    else:
        print_success("No critical issues found!")

    if warnings_found:
        print_warning(f"Found {len(warnings_found)} warnings:")
        for i, warning in enumerate(warnings_found, 1):
            print(f"  {i}. {warning}")

    if not issues_found and not warnings_found:
        print_success("\n🎉 System verification PASSED - All checks OK!")
        sys.exit(0)
    elif issues_found:
        print_error(f"\n⛔ System verification FAILED - {len(issues_found)} issues must be fixed")
        sys.exit(1)
    else:
        print_warning(f"\n⚠️  System verification completed with {len(warnings_found)} warnings")
        sys.exit(0)
