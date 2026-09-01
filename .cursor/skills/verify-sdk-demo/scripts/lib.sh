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
