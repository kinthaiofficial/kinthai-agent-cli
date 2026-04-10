/**
 * WebSocket client — connects to KinthAI backend, handles reconnect,
 * heartbeat, and message stream with content back-fetch.
 */

import WebSocket from 'ws';
import { getMessages } from './api-client.js';
import { emit } from './output.js';

const RECONNECT_BASE_MS = 5000;
const RECONNECT_MAX_MS = 300_000;
const PING_INTERVAL_MS = 30_000;

function now() {
  return Math.floor(Date.now() / 1000);
}

export function startStream({ url, key, agentId, myPublicId, quiet, mentionsOnly, humansOnly, convFilter }) {
  const wsUrl = url.replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(key)}`;
  let reconnectAttempts = 0;
  let pingTimer = null;

  function connect() {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      reconnectAttempts = 0;
    });

    ws.on('message', (raw) => {
      let event;
      try { event = JSON.parse(raw.toString()); } catch { return; }

      // hello → identify (optional, reports CLI version)
      if (event.event === 'hello') {
        ws.send(JSON.stringify({
          event: 'identify',
          api_key: key,
          plugin_version: 'cli-0.1.0',
        }));
        if (!quiet) emit({ type: 'connected', ts: now(), agent_id: agentId, public_id: myPublicId });
        return;
      }

      // ping → pong
      if (event.event === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', ts: event.ts }));
        if (!quiet) emit({ type: 'ping', ts: now() });
        return;
      }

      // message.new → back-fetch content → stdout
      if (event.event === 'message.new') {
        handleMessageNew(event, { url, key, myPublicId, quiet, mentionsOnly, humansOnly, convFilter })
          .catch(() => {}); // errors swallowed, CLI keeps running
      }
    });

    ws.on('close', (code, reason) => {
      clearInterval(pingTimer);
      if (!quiet) emit({ type: 'disconnected', reason: reason?.toString() || `code=${code}`, ts: now() });
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      if (!quiet) emit({ type: 'error', message: err.message, ts: now() });
    });

    // Client-side ping (keep-alive for proxies)
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'ping', ts: Date.now() }));
      }
    }, PING_INTERVAL_MS);
  }

  function scheduleReconnect() {
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts), RECONNECT_MAX_MS);
    reconnectAttempts++;
    setTimeout(connect, delay);
  }

  connect();
}

async function handleMessageNew(event, { url, key, myPublicId, mentionsOnly, humansOnly, convFilter }) {
  const convId = event.conversation_id;
  const msgId = event.message_id;

  // Filter: conversation
  if (convFilter && !convFilter.includes(convId)) return;

  // Back-fetch message content via HTTP API
  const messages = await getMessages(url, key, convId, 5);
  const msg = messages.find(m => m.message_id === msgId);
  if (!msg) return; // deleted or not visible

  // Filter: humans only
  if (humansOnly && msg.sender_type !== 'human') return;

  // Filter: mentions only (using public_id from API response)
  const mentions = msg.mentions || [];
  const mentionedMe = mentions.includes(myPublicId);
  if (mentionsOnly && !mentionedMe) return;

  // Send message receipt
  // (not critical, fire-and-forget)

  emit({
    type: 'message',
    conv: convId,
    msg_id: msgId,
    from: msg.sender_id, // public_id from API
    from_type: msg.sender_type,
    content: msg.content || '',
    mentions,
    mentioned_me: mentionedMe,
    ts: now(),
  });
}
