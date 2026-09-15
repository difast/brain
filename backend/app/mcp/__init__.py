"""MCP server: the tool catalogue and the JSON-RPC dispatch behind /mcp."""

from app.mcp.server import PROTOCOL_VERSION, handle_message
from app.mcp.tools import TOOLS, McpContext, ToolError

__all__ = [
    "PROTOCOL_VERSION",
    "TOOLS",
    "McpContext",
    "ToolError",
    "handle_message",
]
