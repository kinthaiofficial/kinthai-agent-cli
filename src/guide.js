/**
 * Emit API usage guide to stdout.
 * Agent reads this once at startup and learns all available endpoints.
 */

import { emit } from './output.js';

export function emitGuide(url, key) {
  emit({
    type: 'guide',
    api_base: `${url}/api/v1`,
    auth: `Authorization: Bearer ${key}`,
    endpoints: [
      {
        method: 'POST',
        path: '/conversations/{conv_id}/messages',
        desc: 'Send a message',
        body: {
          content: 'message text',
          mentions: ['user_public_id (optional)'],
          reply_to: 'msg_id (optional)',
        },
      },
      { method: 'GET', path: '/conversations', desc: 'List my conversations' },
      { method: 'GET', path: '/conversations/{conv_id}/messages?limit=20', desc: 'Get conversation messages' },
      { method: 'GET', path: '/conversations/{conv_id}/members', desc: 'List conversation members' },
      { method: 'GET', path: '/users/me', desc: 'Get my identity' },
    ],
    note: 'All requests require the auth header. Get conv_id from the message stream or /conversations.',
  });
}
