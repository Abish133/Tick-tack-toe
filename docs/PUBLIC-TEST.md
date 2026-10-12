# Temporary public playtest

`START-PUBLIC-TEST.cmd` starts the full local server and a Cloudflare Quick Tunnel. It prints the current HTTPS URL and writes `docs/test-link.json`. The generated URL may change when the tunnel restarts. Keep the laptop awake and connected to the internet.

This is a limited playtest, not an always-on cloud deployment. Ranked matchmaking requires two human players. To test it, open the URL on two devices or use separate browser profiles, create separate accounts and both select Play Ranked. Guest practice, local classic and seven AI difficulty levels can be tested alone.

`STOP-PUBLIC-TEST.cmd` closes only this project's tunnel, restores the prior local origin/proxy settings and restarts the local game. `STOP-GAME.cmd` stops the game/database but does not close the tunnel; close the public test first when ending a session. Saved accounts remain in this project's isolated MySQL data.

The launcher downloads the official Cloudflared Windows release and verifies its SHA-256 digest. The game binds to localhost, accepts only its exact configured origins, and trusts a validated Cloudflare client-IP header only from the local tunnel proxy. Database credentials, the database port, local source and operator commands are not published through the tunnel.

Quick Tunnels have no uptime guarantee and are intended for development/testing: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/. They support the game's WebSocket connections: https://developers.cloudflare.com/network/websockets/.
