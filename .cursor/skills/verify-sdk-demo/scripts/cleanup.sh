#!/usr/bin/env bash
# Tear down the instance this run started. Keeps ${VERIFY_EVIDENCE_DIR}.
# Usage: .cursor/skills/verify-sdk-demo/scripts/cleanup.sh

set -euo pipefail
# shellcheck source=lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

if [[ ! -f "${VERIFY_INSTANCE_FILE}" ]]; then
  echo "verify-sdk-demo cleanup: no instance file; nothing to stop"
  echo "verify-sdk-demo cleanup: evidence left at ${VERIFY_EVIDENCE_DIR}"
  exit 0
fi

pid="$(verify_read_instance_pid || true)"
if verify_pid_alive "${pid}"; then
  echo "verify-sdk-demo cleanup: stopping pid ${pid}"
  kill "${pid}" 2>/dev/null || true
  for _ in $(seq 1 20); do
    if ! verify_pid_alive "${pid}"; then
      break
    fi
    sleep 0.25
  done
  if verify_pid_alive "${pid}"; then
    echo "verify-sdk-demo cleanup: pid ${pid} still alive; sending TERM to process group" >&2
    kill -TERM "-${pid}" 2>/dev/null || kill -TERM "${pid}" 2>/dev/null || true
    sleep 1
  fi
  if verify_pid_alive "${pid}"; then
    echo "verify-sdk-demo cleanup: pid ${pid} still alive; sending KILL" >&2
    kill -KILL "${pid}" 2>/dev/null || true
  fi
else
  echo "verify-sdk-demo cleanup: recorded pid ${pid} already gone"
fi

rm -f "${VERIFY_INSTANCE_FILE}"
# Keep the log for post-mortems; it is not evidence and may be overwritten next launch.
echo "verify-sdk-demo cleanup: instance stopped"
echo "verify-sdk-demo cleanup: evidence left at ${VERIFY_EVIDENCE_DIR}"
