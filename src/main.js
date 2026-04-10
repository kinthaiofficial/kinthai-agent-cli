/**
 * Main flow: register → getMe → guide → connect → stream.
 */

import { generateAgentId, getMachineId } from './identity.js';
import { loadCredentials, saveCredentials, getAgentCred } from './credentials.js';
import { register, getMe } from './api-client.js';
import { emitGuide } from './guide.js';
import { startStream } from './ws-client.js';
import { emit, emitError } from './output.js';

const DEFAULT_URL = 'https://kinthai.ai';

async function ensureRegistered(options) {
  const { email, url, name, platform } = options;
  const cwd = process.cwd();
  const machineId = getMachineId();
  const agentId = generateAgentId(cwd);

  const creds = await loadCredentials();
  const existing = getAgentCred(creds, agentId);

  if (existing?.api_key) {
    // Credential exists — check email consistency
    if (creds.email && creds.email !== email) {
      emitError(
        `credentials.json email is "${creds.email}", but --email is "${email}". ` +
        `Delete ~/.kinthai/credentials.json to re-register with a different email.`
      );
      process.exit(1);
    }
    return { url: creds.url || url, key: existing.api_key, agentId, machineId, isNew: false };
  }

  // Register new agent
  const agentName = name || `Claude Code (${cwd.split('/').pop()})`;
  const data = await register(url, { email, machineId, agentId, agentName, platform });

  const apiKey = data.api_key;
  if (!apiKey) {
    emitError('No api_key returned from registration');
    process.exit(1);
  }

  // Save credentials
  creds.url = url;
  creds.email = email;
  creds.machine_id = machineId;
  if (!creds.agents) creds.agents = {};
  creds.agents[agentId] = {
    api_key: apiKey,
    name: agentName,
    cwd,
    registered_at: new Date().toISOString(),
  };
  await saveCredentials(creds);

  emit({
    type: 'registered',
    agent_id: agentId,
    kk_agent_id: data.kk_agent_id,
    api_key: apiKey,
    machine_id: machineId,
    name: agentName,
  });

  return { url, key: apiKey, agentId, machineId, isNew: true };
}

export async function main(options) {
  const url = options.url || DEFAULT_URL;

  // Step 1: Register or reuse credentials
  const { url: resolvedUrl, key, agentId } = await ensureRegistered({ ...options, url });

  // Step 2: Get own identity (public_id for mentions filtering)
  const me = await getMe(resolvedUrl, key);
  const myPublicId = me.user_id; // API returns public_id as user_id

  // Step 3: Output API guide
  emitGuide(resolvedUrl, key);

  // Step 4+5: WebSocket connection + message stream
  startStream({
    url: resolvedUrl,
    key,
    agentId,
    myPublicId,
    quiet: options.quiet,
    mentionsOnly: options.mentionsOnly,
    humansOnly: options.humansOnly,
    convFilter: options.convFilter,
  });
}
