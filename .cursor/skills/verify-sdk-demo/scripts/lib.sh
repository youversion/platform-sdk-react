#!/usr/bin/env bash
# Shared paths and env resolution for verify-sdk-demo helpers.
# Source from the other scripts. Do not execute directly.

set -euo pipefail

_skill_scripts_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFY_SKILL_DIR="$(cd "${_skill_scripts_dir}/.." && pwd)"
REPO_ROOT="$(cd "${VERIFY_SKILL_DIR}/../../.." && pwd)"

VERIFY_HOST="${VERIFY_HOST:-127.0.0.1}"
VERIFY_PORT="${VERIFY_PORT:-5177}"
VERIFY_DIR="${VERIFY_DIR:-/tmp/verify-sdk-demo}"
VERIFY_EVIDENCE_DIR="${VERIFY_EVIDENCE_DIR:-${VERIFY_DIR}/evidence}"
VERIFY_INSTANCE_FILE="${VERIFY_DIR}/instance.json"
VERIFY_LOG_FILE="${VERIFY_DIR}/vite.log"

verify_origin() {
  printf 'http://%s:%s' "${VERIFY_HOST}" "${VERIFY_PORT}"
}

# Load VITE_* for the demo. Prefer process env, then monorepo-root env files
# (AGENTS.md: not worktree-local), then examples/vite-react/.env.local.
# Maps YVP_APP_KEY → VITE_YVP_APP_KEY when the Vite-prefixed var is unset.
# Never writes secrets to disk.
verify_load_env() {
  _verify_source_env_file() {
    local file="$1"
    if [[ -f "${file}" ]]; then
      set -a
      # shellcheck disable=SC1090
      . "${file}"
      set +a
    fi
  }

  _verify_source_env_file "${REPO_ROOT}/.env.local"
  _verify_source_env_file "${REPO_ROOT}/.env"
  if [[ -z "${VITE_YVP_APP_KEY:-}" ]]; then
    _verify_source_env_file "${REPO_ROOT}/examples/vite-react/.env.local"
  fi

  if [[ -z "${VITE_YVP_APP_KEY:-}" && -n "${YVP_APP_KEY:-}" ]]; then
    export VITE_YVP_APP_KEY="${YVP_APP_KEY}"
  fi

  export VITE_YVP_API_HOST="${VITE_YVP_API_HOST:-${YVP_API_HOST:-api.youversion.com}}"
  export VITE_YVP_AUTH_REDIRECT_URL="${VITE_YVP_AUTH_REDIRECT_URL:-$(verify_origin)}"
}

verify_ui_built() {
  [[ -f "${REPO_ROOT}/packages/ui/dist/index.js" ]]
}

verify_pid_alive() {
  local pid="$1"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

# Prints the PID listening on VERIFY_HOST:VERIFY_PORT, or empty.
verify_port_pid() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :${VERIFY_PORT}" 2>/dev/null \
      | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
      | head -n 1
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${VERIFY_PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n 1
  fi
}

# True if $1 is $2 or a descendant of $2 (pnpm → sh → vite).
verify_pid_in_tree() {
  local candidate="$1"
  local root="$2"
  local guard=0
  while [[ -n "${candidate}" && "${candidate}" != "0" && "${candidate}" != "1" ]]; do
    if [[ "${candidate}" == "${root}" ]]; then
      return 0
    fi
    candidate="$(awk '/^PPid:/{print $2}' "/proc/${candidate}/status" 2>/dev/null || true)"
    guard=$((guard + 1))
    if [[ "${guard}" -gt 32 ]]; then
      break
    fi
  done
  return 1
}

# Prints recorded pid plus descendants (children first). Used by cleanup only.
verify_process_tree() {
  local root="$1"
  local children
  local child
  children="$(ps -o pid= --ppid "${root}" 2>/dev/null || true)"
  for child in ${children}; do
    verify_process_tree "${child}"
  done
  printf '%s\n' "${root}"
}

verify_stop_tree() {
  local root="$1"
  local pid
  local pids
  pids="$(verify_process_tree "${root}" | tr '\n' ' ')"
  for pid in ${pids}; do
    if verify_pid_alive "${pid}"; then
      kill -TERM "${pid}" 2>/dev/null || true
    fi
  done
  for _ in $(seq 1 20); do
    local any=0
    for pid in ${pids}; do
      if verify_pid_alive "${pid}"; then
        any=1
      fi
    done
    if [[ "${any}" -eq 0 ]]; then
      return 0
    fi
    sleep 0.25
  done
  for pid in ${pids}; do
    if verify_pid_alive "${pid}"; then
      kill -KILL "${pid}" 2>/dev/null || true
    fi
  done
}

verify_read_instance_pid() {
  if [[ ! -f "${VERIFY_INSTANCE_FILE}" ]]; then
    return 1
  fi
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("pid",""))' \
    "${VERIFY_INSTANCE_FILE}"
}

verify_read_instance_port() {
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("port",""))' \
    "${VERIFY_INSTANCE_FILE}"
}

verify_read_instance_listener_pid() {
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("listenerPid",""))' \
    "${VERIFY_INSTANCE_FILE}"
}
