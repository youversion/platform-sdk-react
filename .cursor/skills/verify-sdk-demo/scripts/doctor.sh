#!/usr/bin/env bash
# Read-only: is the verification instance worth driving?
# Usage: .cursor/skills/verify-sdk-demo/scripts/doctor.sh

set -euo pipefail
# shellcheck source=lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

fail() {
  echo "verify-sdk-demo doctor: FAIL: $*" >&2
  exit 1
}

if [[ ! -f "${VERIFY_INSTANCE_FILE}" ]]; then
  fail "no instance file at ${VERIFY_INSTANCE_FILE} — run launch.sh"
fi

pid="$(verify_read_instance_pid || true)"
instance_port="$(verify_read_instance_port || true)"

if ! verify_pid_alive "${pid}"; then
  fail "recorded pid ${pid} is not running"
fi

if [[ "${instance_port}" != "${VERIFY_PORT}" ]]; then
  echo "verify-sdk-demo doctor: WARN: instance port ${instance_port} != VERIFY_PORT ${VERIFY_PORT}" >&2
  VERIFY_PORT="${instance_port}"
fi

port_pid="$(verify_port_pid || true)"
if [[ -z "${port_pid}" ]]; then
  fail "nothing listening on $(verify_origin)"
fi
if [[ "${port_pid}" != "${pid}" ]]; then
  # Vite's listener is often a child of the pnpm wrapper we recorded.
  if [[ "/proc/${port_pid}/" -ef "/proc/${pid}/" ]] || \
     grep -q "^PPid:[[:space:]]*${pid}$" "/proc/${port_pid}/status" 2>/dev/null || \
     grep -q "^PPid:[[:space:]]*${port_pid}$" "/proc/${pid}/status" 2>/dev/null; then
    :
  else
    # Walk one more parent — pnpm -> node -> vite is common.
    listener_ppid="$(awk '/^PPid:/{print $2}' "/proc/${port_pid}/status" 2>/dev/null || true)"
    if [[ "${listener_ppid}" != "${pid}" ]] && \
       ! grep -q "^PPid:[[:space:]]*${pid}$" "/proc/${listener_ppid}/status" 2>/dev/null; then
      fail "port ${VERIFY_PORT} is pid ${port_pid}, not our instance ${pid} — refuse to drive a shared listener"
    fi
  fi
fi

html="$(curl -fsS --max-time 5 "$(verify_origin)/")" || fail "GET $(verify_origin)/ failed"
if ! printf '%s' "${html}" | grep -q 'YouVersion SDK Demo'; then
  fail "HTML title/body is not the SDK demo"
fi

echo "verify-sdk-demo doctor: process pid=${pid} listening on $(verify_origin)"
echo "verify-sdk-demo doctor: static shell ok (title YouVersion SDK Demo)"

node "${VERIFY_SKILL_DIR}/scripts/drive.mjs" doctor
