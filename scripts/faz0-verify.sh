#!/usr/bin/env bash
# Faz 0 ortam doğrulaması (plan: M0). Çıkış kodu 0 = tüm kontroller geçti veya uyarıyla devam.
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() { echo -e "${RED}FAIL:${NC} $*" >&2; exit 1; }
ok()   { echo -e "${GREEN}OK:${NC} $*"; }
warn() { echo -e "${YELLOW}WARN:${NC} $*"; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Solana platform-tools (cargo-build-sbf) — resmi kurulum veya docs/FAZ0_ENVIRONMENT.md
export PATH="${FITSTAKE_PLATFORM_TOOLS:-$HOME/.local/share/solana/install/active_release/bin}:$PATH"

echo "=== FitStake Faz 0 doğrulama ==="
echo "Kök: $ROOT"
echo ""

command -v node >/dev/null || fail "node bulunamadı (Node 20+ önerilir)"
ok "node $(node -v)"

if ! command -v solana >/dev/null; then
  warn "solana CLI yok — brew install solana veya https://docs.solana.com/cli/install-solana-cli-tools"
  SOLANA_OK=0
else
  ok "solana $(solana --version | head -1)"
  RPC_URL="$(solana config get | awk -F': ' '/RPC URL/ {print $2}')"
  if [[ "$RPC_URL" != *"devnet"* ]]; then
    warn "RPC devnet değil: $RPC_URL — öneri: solana config set --url https://api.devnet.solana.com"
  else
    ok "RPC devnet"
  fi
  ADDR="$(solana address 2>/dev/null || true)"
  if [[ -n "$ADDR" ]]; then
    ok "cüzdan adresi: $ADDR"
    BAL="$(solana balance 2>/dev/null || echo "?")"
    ok "devnet bakiye: $BAL"
  fi
  SOLANA_OK=1
fi

if ! command -v anchor >/dev/null; then
  warn "anchor CLI yok — https://www.anchor-lang.com/docs/installation"
  ANCHOR_OK=0
else
  ok "anchor $(anchor --version 2>/dev/null | head -1)"
  ANCHOR_OK=1
fi

if ! command -v cargo-build-sbf >/dev/null; then
  warn "cargo-build-sbf yok — PATH'e ekle: ~/.local/share/solana/install/active_release/bin (docs/FAZ0_ENVIRONMENT.md)"
  PLATFORM_OK=0
else
  ok "cargo-build-sbf $(cargo-build-sbf --version 2>/dev/null | head -1)"
  PLATFORM_OK=1
fi

[[ -f Anchor.toml ]] || fail "Anchor.toml eksik"
[[ -f programs/fitstake_vault/src/lib.rs ]] || fail "programs/fitstake_vault/src/lib.rs eksik"
[[ -f apps/web/package.json ]] || fail "apps/web/package.json eksik"
ok "repo yapısı (Anchor + apps/web) mevcut"

if [[ "${SOLANA_OK:-0}" -eq 1 ]] && [[ "${ANCHOR_OK:-0}" -eq 1 ]] && [[ "${PLATFORM_OK:-0}" -eq 1 ]]; then
  echo ""
  echo "anchor build --no-idl çalıştırılıyor (IDL: Saat 1 / host rustc)..."
  anchor build --no-idl || fail "anchor build başarısız"
  ok "anchor build --no-idl tamam"
fi

echo ""
echo -e "${GREEN}Faz 0 dosya kontrolleri tamam.${NC}"
if [[ "${ANCHOR_OK:-0}" -eq 0 ]] || [[ "${SOLANA_OK:-0}" -eq 0 ]] || [[ "${PLATFORM_OK:-0}" -eq 0 ]]; then
  warn "Eksik araçları kurun; docs/FAZ0_ENVIRONMENT.md — ardından npm run faz0:verify"
fi
