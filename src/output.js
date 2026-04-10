/**
 * Structured stdout output — one JSON per line.
 */

export function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

export function emitError(message) {
  process.stderr.write(`Error: ${message}\n`);
}
