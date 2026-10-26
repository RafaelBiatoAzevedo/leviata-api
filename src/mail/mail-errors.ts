export function mailFailure(
  error: unknown,
  attempts: number,
  maxAttempts: number,
) {
  const data =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : {};
  const code =
    typeof data.code === 'string'
      ? data.code.replace(/[^A-Z0-9_]/gi, '').slice(0, 40)
      : 'SMTP_ERROR';
  const response =
    typeof data.responseCode === 'number' ? data.responseCode : undefined;
  const command = typeof data.command === 'string' ? data.command : '';
  const transient =
    (response !== undefined && response >= 400 && response < 500) ||
    ['EDNS', 'ECONNECTION'].includes(code) ||
    (['ETIMEDOUT', 'ESOCKET', 'ECONNRESET'].includes(code) &&
      [
        'CONN',
        'AUTH',
        'EHLO',
        'HELO',
        'STARTTLS',
        'MAIL FROM',
        'RCPT TO',
      ].includes(command));
  // A dropped connection during DATA may have happened after SMTP acceptance.
  // Never automatically repeat an ambiguous send, including worker restarts.
  const ambiguous =
    response === undefined &&
    !transient &&
    !['EAUTH', 'EOAUTH2', 'EENVELOPE', 'EMESSAGE', 'EREJECTED'].includes(code);
  return {
    status: ambiguous
      ? ('UNKNOWN' as const)
      : transient && attempts < maxAttempts
        ? ('PENDING' as const)
        : ('FAILED' as const),
    errorCode: response ? `${code}_${response}` : code,
    nextAttemptAt: new Date(
      Date.now() + Math.min(3600000, 60000 * 2 ** Math.max(0, attempts - 1)),
    ),
  };
}
