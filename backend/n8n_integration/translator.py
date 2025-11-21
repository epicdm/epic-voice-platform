"""
Funnel to n8n Workflow Translator

Converts funnel structure (nodes + edges) to n8n workflow JSON format.
Maps each funnel node type to corresponding n8n node configuration.
"""

import uuid
import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

# Import funnel models
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from backend.funnel_engine.models import Funnel, FunnelNode, FunnelEdge, NodeType

logger = logging.getLogger(__name__)


class FunnelToN8nTranslator:
    """Translates funnel structure to n8n workflow JSON"""

    def __init__(self, livekit_api_url: str = "https://ai.epic.dm"):
        """
        Initialize translator

        Args:
            livekit_api_url: Base URL for LiveKit API calls
        """
        self.livekit_api_url = livekit_api_url

    def translate_funnel(
        self,
        funnel: Funnel,
        nodes: List[FunnelNode],
        edges: List[FunnelEdge]
    ) -> Dict[str, Any]:
        """
        Translate a complete funnel to n8n workflow JSON

        Args:
            funnel: Funnel model instance
            nodes: List of funnel nodes
            edges: List of funnel edges

        Returns:
            n8n workflow JSON structure
        """
        logger.info(f"Translating funnel: {funnel.name} (ID: {funnel.id})")

        # Map funnel node IDs to n8n node names (for connections)
        node_name_map = {}
        n8n_nodes = []

        # 1. Add webhook trigger as FIRST node
        trigger_node = self._create_webhook_trigger_node(funnel, [50, 50])
        n8n_nodes.append(trigger_node)
        trigger_name = "Webhook Trigger"

        # 2. Translate each funnel node to n8n node
        for idx, node in enumerate(nodes):
            n8n_node_id = str(uuid.uuid4())
            # n8n connections use node NAMES, not IDs!
            node_name_map[node.id] = node.label

            # Position nodes after trigger (offset by 1)
            n8n_node = self._translate_node(node, idx + 1, n8n_node_id)
            if n8n_node:
                n8n_nodes.append(n8n_node)
            else:
                logger.warning(f"Skipping unsupported node type: {node.node_type}")

        # 3. Add completion webhook as LAST node
        completion_node = self._create_completion_webhook_node(
            funnel,
            [250 + (len(nodes) % 3) * 300, 50 + (len(nodes) // 3) * 200]
        )
        n8n_nodes.append(completion_node)
        completion_name = "Completion Webhook"

        # 4. Translate edges to n8n connections
        n8n_connections = self._translate_connections(edges, node_name_map)

        # 5. Connect trigger to first funnel node (if exists)
        if nodes:
            first_node_name = nodes[0].label
            n8n_connections[trigger_name] = {
                "main": [[{
                    "node": first_node_name,
                    "type": "main",
                    "index": 0
                }]]
            }

        # 6. Connect last funnel node to completion webhook
        # Find nodes with no outgoing edges (terminal nodes)
        nodes_with_outgoing = set(edge.source_node_id for edge in edges)
        terminal_nodes = [node for node in nodes if node.id not in nodes_with_outgoing]

        for terminal_node in terminal_nodes:
            terminal_name = node_name_map.get(terminal_node.id)
            if terminal_name:
                if terminal_name not in n8n_connections:
                    n8n_connections[terminal_name] = {"main": [[]]}
                n8n_connections[terminal_name]["main"][0].append({
                    "node": completion_name,
                    "type": "main",
                    "index": 0
                })

        # Build workflow JSON
        workflow = {
            "name": funnel.name,
            "nodes": n8n_nodes,
            "connections": n8n_connections,
            "settings": {
                "executionOrder": "v1",
                "saveExecutionProgress": True,
                "saveManualExecutions": True,
                "saveDataErrorExecution": "all",
                "saveDataSuccessExecution": "all"
            }
        }

        logger.info(f"✅ Translated funnel to n8n workflow: {len(n8n_nodes)} nodes, {len(edges)} connections")

        return workflow

    def _translate_node(self, node: FunnelNode, index: int, node_id: str) -> Optional[Dict[str, Any]]:
        """
        Translate a single funnel node to n8n node format

        Args:
            node: Funnel node to translate
            index: Node index (for positioning)
            node_id: n8n node ID to use

        Returns:
            n8n node JSON or None if unsupported
        """
        # Position in n8n canvas (vertical layout with 200px spacing)
        position = [250 + (index % 3) * 300, 50 + (index // 3) * 200]

        # Map node type to n8n node
        if node.node_type == NodeType.CALL:
            return self._create_call_node(node, position, node_id)
        elif node.node_type == NodeType.EMAIL:
            return self._create_email_node(node, position, node_id)
        elif node.node_type == NodeType.SMS:
            return self._create_sms_node(node, position, node_id)
        elif node.node_type == NodeType.DELAY:
            return self._create_delay_node(node, position, node_id)
        elif node.node_type == NodeType.WEBHOOK:
            return self._create_webhook_node(node, position, node_id)
        elif node.node_type == NodeType.CONDITION:
            return self._create_condition_node(node, position, node_id)
        elif node.node_type == NodeType.END:
            return self._create_end_node(node, position, node_id)
        else:
            logger.error(f"Unknown node type: {node.node_type}")
            return None

    def _create_webhook_trigger_node(self, funnel: Funnel, position: List[int]) -> Dict[str, Any]:
        """Create n8n webhook trigger node (entry point for funnel execution)"""
        return {
            "parameters": {
                "httpMethod": "POST",
                "path": f"funnel-{funnel.id}",
                "responseMode": "lastNode",
                "options": {}
            },
            "id": str(uuid.uuid4()),
            "name": "Webhook Trigger",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1.1,
            "position": position,
            "webhookId": str(uuid.uuid4())
        }

    def _create_completion_webhook_node(self, funnel: Funnel, position: List[int]) -> Dict[str, Any]:
        """Create n8n HTTP Request node to notify backend of completion"""
        return {
            "parameters": {
                "method": "POST",
                "url": f"{self.livekit_api_url}/api/funnels/{funnel.id}/executions/complete",
                "authentication": "headerAuth",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "Content-Type", "value": "application/json"}
                    ]
                },
                "sendBody": True,
                "bodyParameters": {
                    "parameters": [
                        {"name": "execution_id", "value": "={{ $json.execution_id }}"},
                        {"name": "status", "value": "completed"},
                        {"name": "completed_at", "value": "={{ $now }}"}
                    ]
                },
                "options": {}
            },
            "id": str(uuid.uuid4()),
            "name": "Completion Webhook",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": position
        }

    def _create_call_node(self, node: FunnelNode, position: List[int], node_id: str) -> Dict[str, Any]:
        """Create n8n HTTP Request node for LiveKit AI call via backend API"""
        config = node.config or {}
        agent_config_id = config.get("agent_config_id")

        return {
            "parameters": {
                "method": "POST",
                "url": f"{self.livekit_api_url}/api/sip/outbound-call",
                "authentication": "headerAuth",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "Content-Type", "value": "application/json"}
                    ]
                },
                "sendBody": True,
                "bodyParameters": {
                    "parameters": [
                        {"name": "to_number", "value": "={{ $json.phone_number }}"},
                        {"name": "agent_id", "value": agent_config_id},
                        {"name": "from_number", "value": config.get("from_number", "")}
                    ]
                },
                "options": {}
            },
            "id": node_id,
            "name": node.label,
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": position
        }

    def _create_email_node(self, node: FunnelNode, position: List[int], node_id: str) -> Dict[str, Any]:
        """Create n8n native Email Send node with SMTP credentials"""
        config = node.config or {}

        return {
            "parameters": {
                "fromEmail": config.get("from_email", "noreply@epic.dm"),
                "toEmail": "={{ $json.email }}",
                "subject": config.get("subject", ""),
                "text": config.get("body", ""),
                "html": config.get("html_body", ""),
                "options": {}
            },
            "credentials": {
                "smtp": {
                    "name": "Platform SMTP"
                }
            },
            "id": node_id,
            "name": node.label,
            "type": "n8n-nodes-base.emailSend",
            "typeVersion": 2.1,
            "position": position
        }

    def _create_sms_node(self, node: FunnelNode, position: List[int], node_id: str) -> Dict[str, Any]:
        """Create n8n native Twilio SMS node with credentials"""
        config = node.config or {}

        return {
            "parameters": {
                "resource": "sms",
                "operation": "send",
                "from": config.get("from_number", ""),
                "to": "={{ $json.phone_number }}",
                "message": config.get("message", ""),
                "options": {}
            },
            "credentials": {
                "twilioApi": {
                    "name": "Platform Twilio"
                }
            },
            "id": node_id,
            "name": node.label,
            "type": "n8n-nodes-base.twilio",
            "typeVersion": 2,
            "position": position
        }

    def _create_delay_node(self, node: FunnelNode, position: List[int], node_id: str) -> Dict[str, Any]:
        """Create n8n Wait node for delays"""
        config = node.config or {}
        duration = config.get("duration", 3600)  # Default 1 hour

        return {
            "parameters": {
                "amount": duration,
                "unit": "seconds"
            },
            "id": node_id,
            "name": node.label,
            "type": "n8n-nodes-base.wait",
            "typeVersion": 1.1,
            "position": position,
            "webhookId": str(uuid.uuid4())
        }

    def _create_webhook_node(self, node: FunnelNode, position: List[int], node_id: str) -> Dict[str, Any]:
        """Create n8n HTTP Request node for webhook calls"""
        config = node.config or {}

        return {
            "parameters": {
                "method": config.get("method", "POST"),
                "url": config.get("url", ""),
                "sendBody": True,
                "bodyParameters": {
                    "parameters": [
                        {"name": "data", "value": "={{ $json }}"}
                    ]
                }
            },
            "id": node_id,
            "name": node.label,
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": position
        }

    def _create_condition_node(self, node: FunnelNode, position: List[int], node_id: str) -> Dict[str, Any]:
        """Create n8n IF/Switch node for conditional branching"""
        config = node.config or {}

        return {
            "parameters": {
                "conditions": {
                    "string": [
                        {
                            "value1": "={{ $json.status }}",
                            "operation": "equals",
                            "value2": config.get("condition_value", "completed")
                        }
                    ]
                }
            },
            "id": node_id,
            "name": node.label,
            "type": "n8n-nodes-base.if",
            "typeVersion": 2,
            "position": position
        }

    def _create_end_node(self, node: FunnelNode, position: List[int], node_id: str) -> Dict[str, Any]:
        """Create n8n NoOp node for end marker"""
        return {
            "parameters": {},
            "id": node_id,
            "name": node.label,
            "type": "n8n-nodes-base.noOp",
            "typeVersion": 1,
            "position": position
        }

    def _translate_connections(
        self,
        edges: List[FunnelEdge],
        node_name_map: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Translate funnel edges to n8n connections format

        Args:
            edges: List of funnel edges
            node_name_map: Mapping from funnel node IDs to n8n node names (labels)

        Returns:
            n8n connections object
        """
        connections = {}

        for edge in edges:
            source_name = node_name_map.get(edge.source_node_id)
            target_name = node_name_map.get(edge.target_node_id)

            if not source_name or not target_name:
                logger.warning(f"Skipping edge: missing node mapping for {edge.id}")
                continue

            # n8n connection format: { source_name: { main: [[{ node: target_name, type: "main", index: 0 }]] } }
            if source_name not in connections:
                connections[source_name] = {"main": [[]]}

            connections[source_name]["main"][0].append({
                "node": target_name,
                "type": "main",
                "index": 0
            })

        return connections


# Helper function for easy access
def translate_funnel_to_n8n(
    funnel: Funnel,
    nodes: List[FunnelNode],
    edges: List[FunnelEdge],
    livekit_api_url: str = "https://ai.epic.dm"
) -> Dict[str, Any]:
    """
    Convenience function to translate a funnel to n8n workflow

    Args:
        funnel: Funnel model instance
        nodes: List of funnel nodes
        edges: List of funnel edges
        livekit_api_url: Base URL for LiveKit API

    Returns:
        n8n workflow JSON
    """
    translator = FunnelToN8nTranslator(livekit_api_url)
    return translator.translate_funnel(funnel, nodes, edges)
