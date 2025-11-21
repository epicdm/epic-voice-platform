# New SIP Configuration API Endpoints

The following API endpoints need to be added to the user_dashboard.py file to manage SIP configurations:

## GET /api/user/sip/configs
- Returns all SIP configurations for the current user
- Optional query param: `?default=true` to get only the default config

## GET /api/user/sip/configs/{config_id}
- Returns a specific SIP configuration by ID

## POST /api/user/sip/configs
- Creates a new SIP configuration
- Required fields: `name`, `sip_url`
- Optional fields: `sip_username`, `sip_password`, `sip_transport`, `trunk_id`, `is_default`, `inbound_enabled`, `outbound_enabled`

## PUT /api/user/sip/configs/{config_id}
- Updates a specific SIP configuration
- Same fields as POST

## DELETE /api/user/sip/configs/{config_id}
- Deletes a specific SIP configuration
- Returns 400 if the configuration is in use by phone numbers
