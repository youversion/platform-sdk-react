const configuredApiTimeout = Number(import.meta.env.VITE_YVP_API_TIMEOUT_MS);

export const API_TIMEOUT_MS =
  Number.isFinite(configuredApiTimeout) && configuredApiTimeout > 0 ? configuredApiTimeout : 60000;
