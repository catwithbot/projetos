#!/bin/bash
# ============================================================
# backup-db.sh — Backup automático do PostgreSQL
# Coloque em /home/deploy/scripts/backup-db.sh
# Permissão: chmod +x backup-db.sh
# Cron (diário às 02:00): 0 2 * * * /home/deploy/scripts/backup-db.sh
# ============================================================

set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────────────────
DB_NAME="clinic_saas"
DB_USER="clinic_user"
BACKUP_DIR="/var/backups/clinic-saas"
RETENTION_DAYS=30
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="${BACKUP_DIR}/backup_${DATE}.sql.gz"

# ── Criar diretório se não existir ────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Dump comprimido ───────────────────────────────────────────────────────────
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"

echo "[$(date)] Backup criado: $FILENAME ($(du -sh "$FILENAME" | cut -f1))"

# ── Remover backups mais antigos que RETENTION_DAYS ──────────────────────────
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Backups com mais de ${RETENTION_DAYS} dias removidos."
