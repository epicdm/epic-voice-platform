"""
n8n API Client
Handles communication with n8n instance via REST API
"""

import requests
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class N8nClient:
    """Client for interacting with n8n API"""

    def __init__(self, base_url: str, api_key: str):
        """
        Initialize n8n client

        Args:
            base_url: n8n instance URL (e.g., "https://n8n.epic.dm")
            api_key: n8n API key
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "X-N8N-API-KEY": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def test_connection(self) -> bool:
        """
        Test connection to n8n instance

        Returns:
            True if connection successful, False otherwise
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/workflows",
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            logger.info("✅ n8n connection successful")
            return True
        except Exception as e:
            logger.error(f"❌ n8n connection failed: {e}")
            return False

    def create_workflow(self, workflow_data: Dict) -> Dict:
        """
        Create a new workflow in n8n

        Args:
            workflow_data: n8n workflow JSON structure

        Returns:
            Created workflow data with ID

        Raises:
            requests.HTTPError: If API request fails
        """
        try:
            logger.info(f"Creating n8n workflow: {workflow_data.get('name', 'Unnamed')}")

            response = requests.post(
                f"{self.base_url}/api/v1/workflows",
                headers=self.headers,
                json=workflow_data,
                timeout=30,
            )
            response.raise_for_status()

            workflow = response.json()
            logger.info(f"✅ Workflow created: {workflow.get('id')} - {workflow.get('name')}")

            return workflow

        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Failed to create workflow: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error creating workflow: {e}")
            raise

    def update_workflow(self, workflow_id: str, workflow_data: Dict) -> Dict:
        """
        Update an existing workflow

        Args:
            workflow_id: n8n workflow ID
            workflow_data: Updated workflow JSON

        Returns:
            Updated workflow data
        """
        try:
            logger.info(f"Updating n8n workflow: {workflow_id}")

            response = requests.put(
                f"{self.base_url}/api/v1/workflows/{workflow_id}",
                headers=self.headers,
                json=workflow_data,
                timeout=30,
            )
            response.raise_for_status()

            workflow = response.json()
            logger.info(f"✅ Workflow updated: {workflow_id}")

            return workflow

        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Failed to update workflow: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error updating workflow: {e}")
            raise

    def delete_workflow(self, workflow_id: str) -> bool:
        """
        Delete a workflow

        Args:
            workflow_id: n8n workflow ID

        Returns:
            True if deletion successful
        """
        try:
            logger.info(f"Deleting n8n workflow: {workflow_id}")

            response = requests.delete(
                f"{self.base_url}/api/v1/workflows/{workflow_id}",
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()

            logger.info(f"✅ Workflow deleted: {workflow_id}")
            return True

        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Failed to delete workflow: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error deleting workflow: {e}")
            return False

    def get_workflow(self, workflow_id: str) -> Optional[Dict]:
        """
        Get workflow details

        Args:
            workflow_id: n8n workflow ID

        Returns:
            Workflow data or None if not found
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/workflows/{workflow_id}",
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()

            return response.json()

        except requests.exceptions.HTTPError:
            return None
        except Exception as e:
            logger.error(f"❌ Error getting workflow: {e}")
            return None

    def list_workflows(self) -> List[Dict]:
        """
        List all workflows

        Returns:
            List of workflow summaries
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/workflows",
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()

            workflows = response.json()
            logger.info(f"Found {len(workflows.get('data', []))} workflows")

            return workflows.get("data", [])

        except Exception as e:
            logger.error(f"❌ Error listing workflows: {e}")
            return []

    def activate_workflow(self, workflow_id: str) -> bool:
        """
        Activate a workflow (enable for execution)

        Args:
            workflow_id: n8n workflow ID

        Returns:
            True if activated successfully
        """
        try:
            logger.info(f"Activating n8n workflow: {workflow_id}")

            response = requests.post(
                f"{self.base_url}/api/v1/workflows/{workflow_id}/activate",
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()

            workflow = response.json()
            logger.info(f"✅ Workflow activated: {workflow_id}")

            return True

        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Failed to activate workflow: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error activating workflow: {e}")
            return False

    def deactivate_workflow(self, workflow_id: str) -> bool:
        """
        Deactivate a workflow (disable execution)

        Args:
            workflow_id: n8n workflow ID

        Returns:
            True if deactivated successfully
        """
        try:
            logger.info(f"Deactivating n8n workflow: {workflow_id}")

            response = requests.post(
                f"{self.base_url}/api/v1/workflows/{workflow_id}/deactivate",
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()

            workflow = response.json()
            logger.info(f"✅ Workflow deactivated: {workflow_id}")

            return True

        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ Failed to deactivate workflow: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error deactivating workflow: {e}")
            return False

    def get_webhook_url(self, workflow_id: str) -> Optional[str]:
        """
        Extract webhook trigger URL from a workflow

        Args:
            workflow_id: n8n workflow ID

        Returns:
            Full webhook URL or None if no webhook trigger found
        """
        try:
            workflow = self.get_workflow(workflow_id)
            if not workflow:
                logger.error(f"❌ Workflow not found: {workflow_id}")
                return None

            # Find webhook trigger node
            nodes = workflow.get("nodes", [])
            for node in nodes:
                if node.get("type") == "n8n-nodes-base.webhook":
                    # Extract webhook path from parameters
                    params = node.get("parameters", {})
                    webhook_path = params.get("path", "")

                    if webhook_path:
                        # Build full webhook URL
                        webhook_url = f"{self.base_url}/webhook/{webhook_path}"
                        logger.info(f"✅ Found webhook URL: {webhook_url}")
                        return webhook_url

            logger.warning(f"⚠️  No webhook trigger found in workflow {workflow_id}")
            return None

        except Exception as e:
            logger.error(f"❌ Error extracting webhook URL: {e}")
            return None

    def trigger_workflow(self, webhook_url: str, data: Dict) -> Dict:
        """
        Trigger a workflow via webhook

        Args:
            webhook_url: Full webhook URL from n8n
            data: Data to pass to workflow

        Returns:
            Webhook response data
        """
        try:
            logger.info(f"Triggering workflow webhook: {webhook_url}")

            response = requests.post(
                webhook_url,
                json=data,
                timeout=60,
            )
            response.raise_for_status()

            result = response.json() if response.text else {}
            logger.info(f"✅ Workflow triggered successfully")

            return result

        except Exception as e:
            logger.error(f"❌ Error triggering workflow: {e}")
            raise

    def validate_workflow(self, workflow_data: Dict) -> Dict:
        """
        Validate workflow structure before creation/update

        Args:
            workflow_data: n8n workflow JSON structure

        Returns:
            Dict with validation results:
            {
                "valid": bool,
                "errors": List[str],
                "warnings": List[str]
            }
        """
        errors = []
        warnings = []

        # Check required fields
        if not workflow_data.get("name"):
            errors.append("Workflow name is required")

        if not workflow_data.get("nodes"):
            errors.append("Workflow must have at least one node")
        elif len(workflow_data.get("nodes", [])) == 0:
            errors.append("Workflow must have at least one node")

        # Check for trigger node (required for active workflows)
        nodes = workflow_data.get("nodes", [])
        has_trigger = False
        has_webhook = False

        for node in nodes:
            node_type = node.get("type", "")
            if node_type == "n8n-nodes-base.webhook":
                has_webhook = True
                has_trigger = True
                # Validate webhook configuration
                params = node.get("parameters", {})
                if not params.get("path"):
                    errors.append(f"Webhook node '{node.get('name', 'unnamed')}' missing path parameter")
            elif "trigger" in node_type.lower() or node_type.endswith("Trigger"):
                has_trigger = True

        if not has_trigger:
            warnings.append("Workflow has no trigger node - it must be manually executed")

        # Check for disconnected nodes
        connections = workflow_data.get("connections", {})
        node_names = {node.get("name") for node in nodes}
        connected_nodes = set()

        # Add source nodes
        for source_name in connections.keys():
            connected_nodes.add(source_name)
            # Add target nodes
            for output_type in connections[source_name].values():
                for output_list in output_type:
                    for connection in output_list:
                        connected_nodes.add(connection.get("node"))

        disconnected = node_names - connected_nodes
        if disconnected and len(nodes) > 1:
            warnings.append(f"Disconnected nodes found: {', '.join(disconnected)}")

        # Check for duplicate node names
        node_name_counts = {}
        for node in nodes:
            name = node.get("name", "")
            node_name_counts[name] = node_name_counts.get(name, 0) + 1

        duplicates = [name for name, count in node_name_counts.items() if count > 1]
        if duplicates:
            errors.append(f"Duplicate node names found: {', '.join(duplicates)}")

        # Validate node IDs exist
        for node in nodes:
            if not node.get("id"):
                errors.append(f"Node '{node.get('name', 'unnamed')}' missing required 'id' field")
            if not node.get("type"):
                errors.append(f"Node '{node.get('name', 'unnamed')}' missing required 'type' field")

        is_valid = len(errors) == 0

        if is_valid:
            logger.info(f"✅ Workflow validation passed ({len(warnings)} warnings)")
        else:
            logger.error(f"❌ Workflow validation failed: {len(errors)} errors")

        return {
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings
        }

    def check_workflow_status(self, workflow_id: str) -> Optional[Dict]:
        """
        Check if workflow is active and get its status

        Args:
            workflow_id: n8n workflow ID

        Returns:
            Dict with status info or None if error:
            {
                "active": bool,
                "id": str,
                "name": str,
                "has_errors": bool,
                "error_message": str (if has_errors)
            }
        """
        try:
            workflow = self.get_workflow(workflow_id)
            if not workflow:
                return None

            is_active = workflow.get("active", False)

            # Note: n8n doesn't provide error status in workflow GET
            # Errors only show up during execution
            # We can check if workflow was recently deactivated (might indicate errors)

            return {
                "active": is_active,
                "id": workflow.get("id"),
                "name": workflow.get("name"),
                "has_errors": False,  # Can't detect from API
                "error_message": None,
                "node_count": len(workflow.get("nodes", [])),
                "has_webhook": any(
                    node.get("type") == "n8n-nodes-base.webhook"
                    for node in workflow.get("nodes", [])
                )
            }

        except Exception as e:
            logger.error(f"❌ Error checking workflow status: {e}")
            return None
