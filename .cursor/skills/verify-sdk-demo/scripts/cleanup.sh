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
listener_pid="$(verify_read_instance_listener_pid || true)"
if [[ -n "${pid}" ]]; then
  echo "verify-sdk-demo cleanup: stopping pid ${pid} and descendants"
  verify_stop_tree "${pid}"
fi
if [[ -n "${listener_pid}" && "${listener_pid}" != "${pid}" ]]; then
  echo "verify-sdk-demo cleanup: stopping listener pid ${listener_pid} and descendants"
  verify_stop_tree "${listener_pid}"
fi

rm -f "${VERIFY_INSTANCE_FILE}"
# Keep the log for post-mortems; it is not evidence and may be overwritten next launch.
echo "verify-sdk-demo cleanup: instance stopped"
echo "verify-sdk-demo cleanup: evidence left at ${VERIFY_EVIDENCE_DIR}"
