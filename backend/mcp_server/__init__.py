"""Serveur MCP local de LIFE RPG : client de l'API, sans base de données ni Django."""

from mcp_server.server import LifeRpgClient, main

__all__ = ["LifeRpgClient", "main"]
