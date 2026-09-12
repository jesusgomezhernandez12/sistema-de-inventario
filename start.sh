#!/bin/bash
# start.sh - Lanzador estático para Inventario Ganadero (Turso + Static HTML/JS)
# Uso: ./start.sh [opciones]
#   ./start.sh           # Inicia servidor estático (Python/Node/PHP)
#   ./start.sh --init-db # Inicializa schema en Turso (requiere .env configurado)
#   ./start.sh --stop    # Detiene servidor
#   ./start.sh --logs    # Muestra logs
#   ./start.sh --status  # Ver estado

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*"; }

check_env() {
    if [[ ! -f .env ]]; then
        warn "No existe .env, copiando desde .env.example"
        cp .env.example .env
        warn "¡EDITA .env con tus credenciales de Turso antes de continuar!"
        exit 1
    fi
    set -a; source .env; set +a
}

check_server() {
    # PHP es necesario para ejecutar la API y las sesiones del backend
    if command -v php &> /dev/null; then
        SERVER_CMD="php -S"
        SERVER_NAME="PHP"
        return 0
    elif command -v python3 &> /dev/null; then
        SERVER_CMD="python3 -m http.server"
        SERVER_NAME="Python"
        return 0
    elif command -v node &> /dev/null && command -v npx &> /dev/null; then
        SERVER_CMD="npx serve -l"
        SERVER_NAME="Node (serve)"
        return 0
    else
        err "Ningún servidor HTTP disponible. Instala Python3, Node.js o PHP."
        exit 1
    fi
}

init_turso_schema() {
    log "Inicializando schema en Turso..."
    if [[ -z "$TURSO_DATABASE_URL" || -z "$TURSO_AUTH_TOKEN" ]]; then
        err "TURSO_DATABASE_URL y TURSO_AUTH_TOKEN requeridos en .env"
        exit 1
    fi
    
    # Usar Node.js para ejecutar el schema (más confiable que PHP para Turso HTTP)
    if command -v node &> /dev/null; then
        node -e "
            const fs = require('fs');
            const fetch = require('node-fetch');
            
            const url = process.env.TURSO_DATABASE_URL;
            const token = process.env.TURSO_AUTH_TOKEN;
            
            if (url.startsWith('libsql://')) {
                baseUrl = 'https://' + url.slice(9) + '/v2/pipeline';
            } else {
                baseUrl = url.replace(/\/$/, '') + '/v2/pipeline';
            }
            
            const schema = fs.readFileSync('php/schema.sql', 'utf8');
            const statements = schema.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
            
            async function run() {
                for (let i = 0; i < statements.length; i += 50) {
                    const batch = statements.slice(i, i + 50).map(sql => ({
                        type: 'execute',
                        stmt: { sql, args: [] }
                    }));
                    
                    const res = await fetch(baseUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ requests: batch })
                    });
                    
                    const data = await res.json();
                    if (data.error) {
                        console.error('Error:', data.error);
                        process.exit(1);
                    }
                    console.log('Batch', Math.floor(i/50)+1, 'ok');
                }
                console.log('Schema inicializado correctamente');
            }
            run().catch(e => { console.error(e); process.exit(1); });
        "
        ok "Schema aplicado en Turso"
    else
        err "Node.js requerido para --init-db. Instala Node.js o ejecuta el schema manualmente en Turso Shell."
        exit 1
    fi
}

start_server() {
    local port="${APP_PORT:-8000}"
    log "Iniciando servidor estático ($SERVER_NAME) en http://localhost:$port ..."
    
    # Matar proceso anterior
    pkill -f "http.server $port" 2>/dev/null || true
    pkill -f "serve -l $port" 2>/dev/null || true
    pkill -f "php -S localhost:$port" 2>/dev/null || true
    sleep 1
    
    case "$SERVER_NAME" in
        Python)
            python3 -m http.server "$port" --directory "$PROJECT_DIR" > /tmp/static-server.log 2>&1 &
            ;;
        Node)
            npx serve -l "$port" "$PROJECT_DIR" > /tmp/static-server.log 2>&1 &
            ;;
        PHP)
            php -S "localhost:$port" -t "$PROJECT_DIR" > /tmp/static-server.log 2>&1 &
            ;;
    esac
    
    local server_pid=$!
    echo $server_pid > /tmp/static-server.pid
    
    sleep 2
    if kill -0 $server_pid 2>/dev/null; then
        ok "Servidor estático corriendo (PID: $server_pid) en http://localhost:$port"
    else
        err "Error al iniciar servidor. Ver logs: cat /tmp/static-server.log"
        exit 1
    fi
}

stop_all() {
    log "Deteniendo servidor..."
    if [[ -f /tmp/static-server.pid ]]; then
        kill $(cat /tmp/static-server.pid) 2>/dev/null || true
        rm -f /tmp/static-server.pid
        ok "Servidor detenido"
    fi
}

show_logs() {
    tail -f /tmp/static-server.log 2>/dev/null || warn "No hay logs"
}

status() {
    echo -e "\n${BLUE}=== Estado del Proyecto ===${NC}"
    
    if [[ -f /tmp/static-server.pid ]] && kill -0 $(cat /tmp/static-server.pid) 2>/dev/null; then
        ok "Servidor estático: CORRIENDO (PID: $(cat /tmp/static-server.pid))"
    else
        warn "Servidor estático: DETENIDO"
    fi
    
    if [[ -f .env ]]; then
        ok "Configuración .env: PRESENTE"
        if [[ -n "$TURSO_DATABASE_URL" ]]; then
            echo "  BD: TURSO (${TURSO_DATABASE_URL})"
        fi
    else
        warn "Configuración .env: FALTA"
    fi
    echo ""
}

case "${1:-}" in
    --init-db)
        log "Inicializando schema en Turso..."
        check_env
        init_turso_schema
        ;;
    --stop)
        stop_all
        ;;
    --logs)
        show_logs
        ;;
    --status)
        status
        ;;
    *)
        log "Modo: ESTÁTICO (HTML/JS) + Turso (libSQL)"
        check_env
        check_server
        
        if [[ -z "$TURSO_DATABASE_URL" || -z "$TURSO_AUTH_TOKEN" ]]; then
            warn "Configura TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env para conectar a Turso"
            echo "  El frontend funcionará pero sin datos hasta configurar la BD"
        fi
        
        start_server
        
        echo ""
        ok "¡Proyecto iniciado!"
        echo -e "  ${BLUE}App:${NC} http://localhost:${APP_PORT:-8000}"
        echo -e "  ${BLUE}Login:${NC} http://localhost:${APP_PORT:-8000}/login.html"
        echo -e "  ${BLUE}Credenciales:${NC} admin@ganadero.com / admin123"
        echo ""
        echo "Comandos:"
        echo "  ./start.sh --init-db   # Inicializar schema en Turso (1ª vez, requiere Node.js)"
        echo "  ./start.sh --stop      # Detener"
        echo "  ./start.sh --logs      # Ver logs"
        echo "  ./start.sh --status    # Ver estado"
        ;;
esac