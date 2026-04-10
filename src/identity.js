import crypto from 'node:crypto';
import os from 'node:os';

/**
 * Generate a deterministic agent_id from hostname + cwd.
 * Same machine + same directory = same agent (idempotent).
 */
export function generateAgentId(cwd) {
  const hostname = os.hostname();
  const raw = `${hostname}:${cwd}`;
  return `cc_${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 8)}`;
}

export function getMachineId() {
  return os.hostname();
}
