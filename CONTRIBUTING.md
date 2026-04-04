# Contributing to FitStake

Thank you for your interest in contributing to FitStake. Please read these guidelines before opening an issue or submitting a pull request.

> **Note:** FitStake is a proprietary project. All contributions become the property of the author. By submitting a pull request, you agree that your contribution may be used under the terms of the project's [LICENSE](LICENSE).

---

## Code of Conduct

Be respectful and constructive in all interactions. Harassment, personal attacks, or disrespectful behavior will not be tolerated.

---

## Reporting Bugs

Before opening a bug report:
- Search [existing issues](../../issues) to avoid duplicates
- Confirm the bug is reproducible on Solana Devnet with a fresh browser session

When ready, open an issue using the **Bug Report** template. Include:
- Clear steps to reproduce
- What you expected vs. what actually happened
- Your browser, OS, and Phantom wallet version
- Console errors (if any)

---

## Requesting Features

Open an issue using the **Feature Request** template. Describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

Feature requests are not guaranteed to be implemented. Priority is given to requests that align with the core "stake-to-fit" concept.

---

## Submitting Pull Requests

### Branch Naming

| Type | Convention | Example |
|------|-----------|---------|
| Bug fix | `fix/short-description` | `fix/claim-button-disabled` |
| Feature | `feat/short-description` | `feat/burpee-exercise` |
| Documentation | `docs/short-description` | `docs/update-readme` |
| Refactor | `refactor/short-description` | `refactor/storage-layer` |

### Workflow

1. Fork the repository
2. Create a branch from `main` using the naming convention above
3. Make your changes — keep them focused and minimal
4. Test your changes manually (connect wallet, stake, exercise, claim)
5. Open a PR against `main` using the PR template

### Commit Messages

Use concise, imperative-mood commit messages:

```
fix: prevent double-claim on quick demo challenge
feat: add burpee exercise detection
docs: update smart contract section in README
refactor: extract rep counter into custom hook
```

Format: `type: short description` (under 72 characters)

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`

### PR Requirements

- One focused change per PR (no bundling unrelated fixes)
- PRs must not break the stake → exercise → claim flow
- Smart contract changes require extra scrutiny — tag the maintainer

---

## Development Setup

See the [README](README.md#installation--setup) for full setup instructions.

Quick start:

```bash
npm install
npm run dev
```

---

## Questions?

Open a [Discussion](../../discussions) or file an issue with the `question` label.
