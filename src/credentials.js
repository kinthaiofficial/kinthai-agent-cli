import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';

const CRED_DIR = join(os.homedir(), '.kinthai');
const CRED_FILE = join(CRED_DIR, 'credentials.json');

export async function loadCredentials() {
  try {
    return JSON.parse(await readFile(CRED_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export async function saveCredentials(creds) {
  await mkdir(CRED_DIR, { recursive: true });
  await writeFile(CRED_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function getAgentCred(creds, agentId) {
  return creds.agents?.[agentId] || null;
}
