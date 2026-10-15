// Only stable identifiers go to runtime logs. Driver messages can contain
// credentials, SQL or private connection strings and are deliberately omitted.
export function runtimeErrorDetails(error) {
  const token=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,80}$/.test(value)?value:undefined;
  return {errorName:token(error?.name)||'Error',
    ...(token(error?.code)?{errorCode:error.code}:{}),
    ...(Number.isSafeInteger(error?.errno)?{errorNumber:error.errno}:{}),
    ...(token(error?.syscall)?{syscall:error.syscall}:{}),
  };
}

const transientCodes=new Set(['ECONNREFUSED','ECONNRESET','ETIMEDOUT','EAI_AGAIN','ENOTFOUND',
  'EHOSTUNREACH','ENETUNREACH','EPIPE','PROTOCOL_CONNECTION_LOST','PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_CON_COUNT_ERROR','P1001','P1002','P1008','P1017','COORDINATOR_WAIT_TIMEOUT']);
export const TRANSIENT_RUNTIME_EXIT=75;
export function transientRuntimeError(error) {
  return transientCodes.has(error?.code)||transientCodes.has(error?.cause?.code);
}
