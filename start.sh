#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
RUNTIME_DIR="${PROJECT_DIR}/.run"
PID_FILE="${RUNTIME_DIR}/dashboard.pid"
LOG_FILE="${RUNTIME_DIR}/dashboard.log"
JOBS_PORT="${JOBS_PORT:-3000}"
APP_URL="http://localhost:${JOBS_PORT}"

process_start_ticks() {
  local process_id="$1"
  [[ -r "/proc/${process_id}/stat" ]] || return 1
  awk '{print $22}' "/proc/${process_id}/stat"
}

managed_process_is_running() {
  local process_id saved_ticks current_ticks
  [[ -f "${PID_FILE}" ]] || return 1
  read -r process_id saved_ticks < "${PID_FILE}" || return 1
  [[ "${process_id}" =~ ^[0-9]+$ && "${saved_ticks}" =~ ^[0-9]+$ ]] || return 1
  kill -0 "${process_id}" 2>/dev/null || return 1
  current_ticks="$(process_start_ticks "${process_id}")" || return 1
  [[ "${current_ticks}" == "${saved_ticks}" ]]
}

open_browser() {
  local opener=""
  if command -v wslview >/dev/null 2>&1; then
    opener=wslview
  elif command -v xdg-open >/dev/null 2>&1; then
    opener=xdg-open
  fi
  if [[ -n "${opener}" ]]; then
    "${opener}" "${APP_URL}" >/dev/null 2>&1 &
    disown 2>/dev/null || true
  else
    printf 'Aucun opener disponible. Ouvrez manuellement %s\n' "${APP_URL}"
  fi
}

mkdir -p "${RUNTIME_DIR}"

if managed_process_is_running; then
  printf 'Le dashboard est déjà lancé : %s\n' "${APP_URL}"
  open_browser
  exit 0
fi

rm -f "${PID_FILE}"

if curl --silent --fail --max-time 1 "${APP_URL}" >/dev/null 2>&1; then
  printf 'Le port %s est déjà utilisé par une autre application.\n' "${JOBS_PORT}" >&2
  printf 'Utilisez par exemple : JOBS_PORT=3100 %s\n' "$0" >&2
  exit 1
fi

select_node() {
  # nvm (Windows, macOS) puis mise (Linux, Omarchy).
  local nvm_root="${NVM_DIR:-${HOME}/.nvm}"
  if [[ -s "${nvm_root}/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "${nvm_root}/nvm.sh"
  fi

  if command -v nvm >/dev/null 2>&1; then
    if nvm use --silent; then
      export PATH="${NVM_BIN}:${PATH}"
      hash -r
      return 0
    fi
    printf 'La version Node déclarée dans .nvmrc est absente. Lancez : nvm install\n' >&2
    return 1
  fi

  if command -v mise >/dev/null 2>&1; then
    # Le tool doit être explicite : sans lui, mise ne sait rien déduire du
    # .nvmrc. package.json exige >=22.13.0, donc une version majeure recente
    # convient et evite d'installer celle du .nvmrc sans necessite.
    local requested=""
    if [[ -f .nvmrc ]]; then
      requested="$(tr -d '[:space:]' < .nvmrc)"
    fi
    if [[ -n $requested ]] && mise use "node@${requested}" --silent 2>/dev/null; then
      hash -r
      return 0
    fi
    if mise use "node@${JOBS_NODE_MAJOR:-26}" --silent 2>/dev/null; then
      hash -r
      return 0
    fi
    printf 'mise est présent mais n’a pas pu activer Node. Lancez : mise install node\n' >&2
    return 1
  fi

  if command -v node >/dev/null 2>&1; then
    printf 'nvm et mise absents : utilisation du Node système %s\n' "$(node --version)"
    return 0
  fi

  printf 'Aucun gestionnaire de versions trouvé. Installez nvm ou mise, ou un Node >= 22.\n' >&2
  return 1
}

cd "${PROJECT_DIR}"
select_node

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 22 )); then
  printf 'Node 22 ou plus récent est requis. Version active : %s\n' "$(node --version)" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  hash -r
fi

if [[ ! -d "${PROJECT_DIR}/node_modules" ]]; then
  printf 'Installation des dépendances…\n'
  corepack pnpm install
fi

: > "${LOG_FILE}"

needs_build() {
  [[ "${JOBS_REBUILD:-0}" == "1" || ! -f .next/BUILD_ID ]] && return 0
  local build_input
  for build_input in src public drizzle package.json pnpm-lock.yaml tsconfig.json next.config.* postcss.config.* .env .env.*; do
    [[ -e "${build_input}" ]] || continue
    if [[ -n "$(find "${build_input}" -type f -newer .next/BUILD_ID -print -quit)" ]]; then
      return 0
    fi
  done
  return 1
}

if needs_build; then
  printf 'Compilation de la version production…\n'
  if ! corepack pnpm build --webpack >> "${LOG_FILE}" 2>&1; then
    printf 'La compilation a échoué. Le serveur n’a pas été lancé.\n' >&2
    tail -n 30 "${LOG_FILE}" >&2
    exit 1
  fi
else
  printf 'Version production déjà compilée.\n'
fi

nohup setsid corepack pnpm start --hostname 127.0.0.1 --port "${JOBS_PORT}" \
  >> "${LOG_FILE}" 2>&1 < /dev/null &
SERVER_PID=$!

for _ in {1..20}; do
  START_TICKS="$(process_start_ticks "${SERVER_PID}" 2>/dev/null || true)"
  if [[ -n "${START_TICKS}" ]]; then
    printf '%s %s\n' "${SERVER_PID}" "${START_TICKS}" > "${PID_FILE}"
    break
  fi
  sleep 0.1
done

if [[ ! -f "${PID_FILE}" ]]; then
  printf 'Impossible d’identifier le processus de démarrage.\n' >&2
  exit 1
fi

for _ in {1..60}; do
  if curl --silent --fail --max-time 1 "${APP_URL}" >/dev/null 2>&1; then
    printf 'Dashboard lancé en production : %s\n' "${APP_URL}"
    printf 'Logs : %s\n' "${LOG_FILE}"
    open_browser
    exit 0
  fi

  if ! managed_process_is_running; then
    printf 'Le dashboard n’a pas réussi à démarrer. Dernières lignes du journal :\n' >&2
    tail -n 30 "${LOG_FILE}" >&2
    rm -f "${PID_FILE}"
    exit 1
  fi
  sleep 0.5
done

printf 'Le serveur ne répond pas après 30 secondes. Consultez %s\n' "${LOG_FILE}" >&2
kill -TERM -- "-${SERVER_PID}" 2>/dev/null || true
rm -f "${PID_FILE}"
exit 1
