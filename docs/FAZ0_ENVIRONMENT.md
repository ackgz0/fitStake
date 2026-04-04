# Faz 0 — Ortam (M0)

Bu dosya [plan](/.cursor/plans/fitstake_4_saat_planı_f6ccf2bc.plan.md) içindeki Faz 0 kriterlerini karşılamak için gerekli araçları özetler.

## Paket yöneticisi

- **npm** (kök `package.json` workspaces: `apps/web`)

## Node.js

- **Node 20+** önerilir (`node -v`).

## Solana CLI

1. Kurulum: `brew install solana` veya [Install Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools). `solana --version` ile **Agave 3.1.x** (veya `cargo-build-sbf` ile aynı major) kullanın.
2. Devnet: `solana config set --url https://api.devnet.solana.com`
3. Varsayılan keypair: `~/.config/solana/id.json` (repoya **asla** commit etmeyin)
4. Bakiye: `solana airdrop 2 $(solana address) --url devnet` (limit aşılırsa [faucet](https://faucet.solana.com/) veya alternatif cüzdan)

## Anchor

- Sürüm: `Anchor.toml` içindeki `[toolchain] anchor_version` ile hizalı olmalı (şu an **0.30.1**).
- Kurulum: [Anchor installation](https://www.anchor-lang.com/docs/installation) (`avm` veya `cargo install anchor-cli`).
- **Rust toolchain:** `rust-toolchain.toml` → **1.79.0** (SBF `rustc` ile uyum). `Cargo.lock` güncellerken: `rustup run 1.79.0 cargo generate-lockfile` (lockfile **v3**).
- **Solana platform-tools (`cargo-build-sbf`):** Homebrew `solana` paketi bunları içermeyebilir. [Agave releases](https://github.com/anza-xyz/agave/releases) üzerinden `solana-release-aarch64-apple-darwin.tar.bz2` (ör. **v3.1.11**) indirip `bin` içeriğini şuraya kopyalayın: `~/.local/share/solana/install/active_release/bin` (PATH’e ekleyin). Ortam değişkeni: `FITSTAKE_PLATFORM_TOOLS` ile özel dizin verilebilir.
- **`jobserver = "=0.1.31"` (programs/fitstake_vault):** `0.1.33+` → `getrandom` 0.3 → `wit-bindgen` (edition2024) zinciri; SBF’deki `cargo` 1.79 manifest parse edemez. `0.1.30` ise wasm hedefinde derleme hatası verebilir. **0.1.31** bu iki sorunu birlikte önler.
- **Faz 0 derleme:** `anchor build --no-idl` — IDL üretimi host `rustc`/proc-macro2 ile ek adım gerektirir; tam `anchor build` (IDL) Saat 1’de ele alınabilir.

## Bağımlılık sabitleleri (programs/fitstake_vault)

SBF `rustc` 1.79 ve `cargo` sürümüyle uyum için `Cargo.toml` içinde `blake3`, `proc-macro-crate`, `indexmap`, `unicode-segmentation` sabitlenmiştir; gereksiz güncelleme yapmayın veya `anchor build` sonrası test edin.

## Phantom (demo)

- Tarayıcıda [Phantom](https://phantom.app/) kurulu olsun.
- Ayarlar → **Ağ: Devnet** (hackathon demosu için).

## Doğrulama komutları

```bash
# Yapı + Next.js build (Rust gerekmez)
npm install
npm run test:faz0

# Solana + Anchor kuruluysa tam kontrol + anchor build
bash scripts/faz0-verify.sh
```

## Repo yapısı (Faz 0 kararı)

- **Seçenek B uygulandı:** Önce Next.js (`apps/web`), ardından Anchor programı (`programs/fitstake_vault`) aynı repoda.
- Kök: `Anchor.toml`, `Cargo.toml`, `package.json` (workspaces).
