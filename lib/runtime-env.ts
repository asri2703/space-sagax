type RuntimeEnv = Record<string, string | undefined> & {
  DB?: unknown;
};

declare global {
  // eslint-disable-next-line no-var
  var __SAGA_RUNTIME_ENV__: RuntimeEnv | undefined;
}

export function setRuntimeEnv(env: RuntimeEnv) {
  globalThis.__SAGA_RUNTIME_ENV__ = env;
}

export function getRuntimeEnv(): RuntimeEnv {
  return (
    globalThis.__SAGA_RUNTIME_ENV__ ||
    (typeof process !== "undefined" ? (process.env as RuntimeEnv) : {})
  );
}

export function getRuntimeEnvValue(name: string, fallback = "") {
  return String(getRuntimeEnv()[name] || fallback).trim();
}
