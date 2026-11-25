#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
RUNTIME_DIR="${PROJECT_DIR}/.run"
PID_FILE="${RUNTIME_DIR}/dashboard.pid"

process_start_ticks() {
  local process_id="$1"
  [[ -r "/proc/${process_id}/stat" ]] || return 1
  awk '{print $22}' "/proc/${process_id}/stat"
}

if [[ ! -f "${PID_FILE}" ]]; then
  printf 'Le dashboard est déjà arrêté.\n'
  exit 0
fi

read -r SERVER_PID SAVED_TICKS < "${PID_FILE}" || true
if [[ ! "${SERVER_PID:-}" =~ ^[0-9]+$ || ! "${SAVED_TICKS:-}" =~ ^[0-9]+$ ]]; then
  rm -f "${PID_FILE}"
  printf 'Fichier de processus invalide supprimé ; aucun processus n’a été arrêté.\n'
  exit 0
fi

CURRENT_TICKS="$(process_start_ticks "${SERVER_PID}" 2>/dev/null || true)"
if [[ -z "${CURRENT_TICKS}" || "${CURRENT_TICKS}" != "${SAVED_TICKS}" ]]; then
  rm -f "${PID_FILE}"
  printf 'Le dashboard était déjà arrêté.\n'
  exit 0
fi

printf 'Arrêt du dashboard…\n'
kill -TERM -- "-${SERVER_PID}" 2>/dev/null || kill -TERM "${SERVER_PID}" 2>/dev/null || true

for _ in {1..40}; do
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    rm -f "${PID_FILE}"
    printf 'Dashboard arrêté.\n'
    exit 0
  fi
  sleep 0.25
done

printf 'Arrêt forcé du groupe de processus.\n'
kill -KILL -- "-${SERVER_PID}" 2>/dev/null || kill -KILL "${SERVER_PID}" 2>/dev/null || true
rm -f "${PID_FILE}"
printf 'Dashboard arrêté.\n'
