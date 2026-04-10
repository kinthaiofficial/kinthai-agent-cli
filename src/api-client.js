/**
 * HTTP API client for KinthAI backend.
 * Uses native fetch (Node.js 18+).
 */

export async function register(url, { email, machineId, agentId, agentName, platform }) {
  const res = await fetch(`${url}/api/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      openclaw_machine_id: machineId,
      openclaw_agent_id: agentId,
      openclaw_agent_name: agentName,
      platform: platform || 'claudecode',
    }),
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(data.message || `Registration failed: ${res.status}`);
  }
  return data; // { api_key, kk_agent_id, [user_id on 409] }
}

export async function getMe(url, apiKey) {
  const res = await fetch(`${url}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`GET /users/me failed: ${res.status}`);
  return res.json();
}

export async function getMessages(url, apiKey, convId, limit = 5) {
  const res = await fetch(`${url}/api/v1/conversations/${convId}/messages?limit=${limit}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data.messages || [];
}
