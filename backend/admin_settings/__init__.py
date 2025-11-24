"""
Admin Settings Module
System-wide configuration management
"""

from backend.admin_settings.models import SystemSetting, DEFAULT_SETTINGS
from backend.admin_settings.service import SystemSettingsService
from backend.admin_settings.routes import admin_settings_api

__all__ = [
    'SystemSetting',
    'DEFAULT_SETTINGS',
    'SystemSettingsService',
    'admin_settings_api',
]
