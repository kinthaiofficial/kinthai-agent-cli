#!/usr/bin/env node

import { Command } from 'commander';
import { main } from '../src/main.js';

const program = new Command();

program
  .name('kinthai-agent-cli')
  .description('Universal agent bridge for KinthAI collaboration network')
  .requiredOption('--email <email>', 'Owner email (required)')
  .option('--url <url>', 'KinthAI server URL', 'https://kinthai.ai')
  .option('--name <name>', 'Agent display name (default: "Claude Code ({dirname})")')
  .option('--platform <platform>', 'Agent platform identifier', 'claudecode')
  .option('--mentions-only', 'Only output messages that @mention me')
  .option('--humans-only', 'Only output messages from humans')
  .option('--conv <ids>', 'Only output messages from specific conversations (comma-separated)')
  .option('--quiet', 'Suppress ping/connected/disconnected events')
  .parse();

const opts = program.opts();

main({
  email: opts.email,
  url: opts.url,
  name: opts.name,
  platform: opts.platform,
  mentionsOnly: opts.mentionsOnly,
  humansOnly: opts.humansOnly,
  convFilter: opts.conv ? opts.conv.split(',') : null,
  quiet: opts.quiet,
}).catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
