#!/usr/bin/env bash
# Daily backup of uploaded photos + face engine data (MongoDB Atlas has its
# own backups). Keeps the last 14 days.
# Install:  chmod +x deploy/backup.sh
#           crontab -e   and add:   30 3 * * * /home/trace/trace/deploy/backup.sh
set -euo pipefail

BACKUP_DIR=/home/trace/backups
STAMP=$(date +%F)
mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/trace-$STAMP.tar.gz" \
  /var/trace/uploads \
  /home/trace/trace/face_dtc/face_dtc/data

find "$BACKUP_DIR" -name 'trace-*.tar.gz' -mtime +14 -delete
