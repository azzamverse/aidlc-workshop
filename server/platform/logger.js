function write(stream, level, message, fields) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...fields };
  stream.write(`${JSON.stringify(entry)}\n`);
}

/** Structured one-line logging. Failures go to stderr, everything else to stdout. */
export const logger = {
  info: (message, fields = {}) => write(process.stdout, 'INFO', message, fields),
  error: (message, error, fields = {}) =>
    write(process.stderr, 'ERROR', message, { ...fields, error: error?.stack ?? String(error) }),
};
