#!/usr/bin/env bash
# Start an isolated Vite demo for verification. Writes ${VERIFY_DIR}/instance.json.
# Usage (from repo root): .cursor/skills/verify-sdk-demo/scripts/launch.sh

set -euo pipefail
# shellcheck source=lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

mkdir -p "${VERIFY_DIR}" "${VERIFY_EVIDENCE_DIR}"
verify_load_env

if [[ -f "${VERIFY_INSTANCE_FILE}" ]]; then
  existing_pid="$(verify_read_instance_pid || true)"
  if verify_pid_alive "${existing_pid}"; then
    existing_port="$(verify_read_instance_port)"
    echo "verify-sdk-demo: already running pid=${existing_pid} port=${existing_port}" >&2
    echo "verify-sdk-demo: origin=$(verify_origin)" >&2
    echo "verify-sdk-demo: refuse to start a second process in ${VERIFY_DIR}" >&2
    echo "verify-sdk-demo: set VERIFY_DIR and VERIFY_PORT to isolate another instance" >&2
    exit 1
  fi
  rm -f "${VERIFY_INSTANCE_FILE}"
fi

port_pid="$(verify_port_pid || true)"
if [[ -n "${port_pid}" ]]; then
  echo "verify-sdk-demo: port ${VERIFY_PORT} is already owned by pid ${port_pid}" >&2
  echo "verify-sdk-demo: refusing to share that listener. Pick VERIFY_PORT or stop that process." >&2
  exit 1
fi

if ! verify_ui_built; then
  echo "verify-sdk-demo: packages/ui/dist/index.js is missing. From ${REPO_ROOT} run: pnpm build" >&2
  exit 1
fi

if [[ -z "${VITE_YVP_APP_KEY:-}" ]]; then
  echo "verify-sdk-demo: VITE_YVP_APP_KEY is empty. The demo will render the missing-app-key panel." >&2
  echo "verify-sdk-demo: set VITE_YVP_APP_KEY or YVP_APP_KEY, or add it to ${REPO_ROOT}/.env.local" >&2
fi

: >"${VERIFY_LOG_FILE}"

echo "verify-sdk-demo: starting vite on $(verify_origin)" >&2

(
  cd "${REPO_ROOT}"
  exec pnpm --filter vite-react dev --host "${VERIFY_HOST}" --port "${VERIFY_PORT}"
) >>"${VERIFY_LOG_FILE}" 2>&1 &
vite_pid=$!

python3 - "${VERIFY_INSTANCE_FILE}" "${vite_pid}" "${VERIFY_HOST}" "${VERIFY_PORT}" "${VERIFY_LOG_FILE}" "${REPO_ROOT}" <<'PY'
import json, sys
path, pid, host, port, log, root = sys.argv[1:]
with open(path, "w", encoding="utf-8") as fh:
    json.dump(
        {
            "pid": int(pid),
            "host": host,
            "port": int(port),
            "origin": f"http://{host}:{port}",
            "log": log,
            "repoRoot": root,
        },
        fh,
        indent=2,
    )
    fh.write("\n")
PY

cleanup_on_fail() {
  if verify_pid_alive "${vite_pid}"; then
    kill "${vite_pid}" 2>/dev/null || true
    wait "${vite_pid}" 2>/dev/null || true
  fi
  rm -f "${VERIFY_INSTANCE_FILE}"
}

ready=0
for _ in $(seq 1 60); do
  if ! verify_pid_alive "${vite_pid}"; then
    echo "verify-sdk-demo: vite exited before ready. Last log lines:" >&2
    tail -n 40 "${VERIFY_LOG_FILE}" >&2 || true
    cleanup_on_fail
    exit 1
  fi
  if curl -fsS --max-time 2 "$(verify_origin)/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.5
done

if [[ "${ready}" -ne 1 ]]; then
  echo "verify-sdk-demo: timed out waiting for $(verify_origin)" >&2
  tail -n 40 "${VERIFY_LOG_FILE}" >&2 || true
  cleanup_on_fail
  exit 1
fi

echo "verify-sdk-demo: ready pid=${vite_pid} origin=$(verify_origin)"
echo "verify-sdk-demo: instance ${VERIFY_INSTANCE_FILE}"
echo "verify-sdk-demo: log ${VERIFY_LOG_FILE}"
