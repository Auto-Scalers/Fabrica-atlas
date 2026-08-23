#!/usr/bin/env bash
# sync-public.sh — Sync main branch to public repo (incremental commits)
#
# Usage: bash scripts/sync-public.sh
#
# Uses a WHITELIST approach: only specified files/dirs from main are included.
# Everything else stays private. Personal data files are restored from the
# public-launch branch HEAD (empty schemas) after overlay, so they never leak.
#
# Pushes incremental commits — does NOT force-push or amend.

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$WORKSPACE_ROOT"

# ─── Whitelist: only these paths get published ───────────────────────────────
INCLUDE_PATHS=(
  # App
  "mission-control"
  # Agent infrastructure
  ".claude"
  ".claude-plugin"
  ".github"
  "commands"
  "scripts"
  "skills"
  # Root files
  ".gitignore"
  "CLAUDE.md"
  "CONTRIBUTING.md"
  "LICENSE"
  "README.md"
)

# Files to remove AFTER overlay (private assets that live inside included dirs)
EXCLUDE_FILES=(
  "mission-control/docs/logo.png"
  "mission-control/docs/logo.svg"
  ".claude/launch.json"
  "scripts/start-mc-test.js"
)

# Personal data files — restored from public-launch HEAD after overlay (empty schemas)
PERSONAL_DATA_FILES=(
  "mission-control/data/tasks.json"
  "mission-control/data/goals.json"
  "mission-control/data/projects.json"
  "mission-control/data/brain-dump.json"
  "mission-control/data/inbox.json"
  "mission-control/data/activity-log.json"
  "mission-control/data/decisions.json"
  "mission-control/data/missions.json"
  "mission-control/data/tasks-archive.json"
  "mission-control/data/respond-runs.json"
  "mission-control/data/field-ops/activity-log.json"
  "mission-control/data/field-ops/missions.json"
  "mission-control/data/field-ops/services.json"
  "mission-control/data/field-ops/tasks.json"
)

# Empty schema for each personal data file (used when file is new to public-launch)
declare -A EMPTY_SCHEMAS
EMPTY_SCHEMAS=(
  ["mission-control/data/tasks.json"]='{ "tasks": [] }'
  ["mission-control/data/goals.json"]='{ "goals": [] }'
  ["mission-control/data/projects.json"]='{ "projects": [] }'
  ["mission-control/data/brain-dump.json"]='{ "entries": [] }'
  ["mission-control/data/inbox.json"]='{ "messages": [] }'
  ["mission-control/data/activity-log.json"]='{ "events": [] }'
  ["mission-control/data/decisions.json"]='{ "decisions": [] }'
  ["mission-control/data/missions.json"]='{ "missions": [] }'
  ["mission-control/data/tasks-archive.json"]='{ "tasks": [] }'
  ["mission-control/data/respond-runs.json"]='{ "runs": [] }'
  ["mission-control/data/field-ops/activity-log.json"]='{ "events": [] }'
  ["mission-control/data/field-ops/missions.json"]='{ "missions": [{"id":"fmission_gmail_test","title":"Gmail Integration Test","description":"Quick test to verify the Gmail service connection works end-to-end. One test email to enteryouremail@youremail.com.","status":"active","autonomyLevel":"approve-all","linkedProjectId":null,"tasks":["ftask_gmail_01"],"createdAt":"2026-03-24T00:00:00.000Z","updatedAt":"2026-03-24T00:00:00.000Z","completedAt":null}] }'
  ["mission-control/data/field-ops/services.json"]='{ "services": [{"id":"gmail","name":"Gmail","mcpPackage":"gmail-mcp","status":"saved","authType":"oauth2","credentialId":null,"riskLevel":"medium","capabilities":["send-email","read-email","manage-labels","attachments","search"],"allowedAgents":["marketer","developer"],"config":{},"catalogId":"gmail","installedAt":"2026-03-24T00:00:00.000Z","lastUsed":null}] }'
  ["mission-control/data/field-ops/tasks.json"]='{ "tasks": [{"id":"ftask_gmail_01","missionId":"fmission_gmail_test","title":"Test email: Gmail integration check","description":"Send a test email to verify the Gmail service connection works end-to-end through Field Ops.","type":"email-campaign","serviceId":"gmail","assignedTo":null,"status":"draft","approvalRequired":true,"payload":{"to":"enteryouremail@youremail.com","subject":"Mission Control — Gmail Integration Test","body":"This email was sent by Mission Control Field Ops system.\n\nIf you are reading this, the Gmail integration is working. This email was queued as a field task, approved by a human, and executed through the Field Ops pipeline.\n\n— Mission Control v0.10"},"result":{},"attachments":[],"linkedTaskId":null,"blockedBy":[],"rejectionFeedback":null,"approvedBy":null,"rejectedBy":null,"createdAt":"2026-03-24T00:00:00.000Z","updatedAt":"2026-03-24T00:00:00.000Z","executedAt":null,"completedAt":null}] }'
)

# Config/template data files that SHOULD sync from main (not personal)
SAFE_DATA_FILES=(
  "mission-control/data/agents.json"
  "mission-control/data/skills-library.json"
  "mission-control/data/daemon-config.json"
  "mission-control/data/checkpoints/snap_demo.json"
  "mission-control/data/field-ops/approval-config.json"
  "mission-control/data/field-ops/safety-limits.json"
  "mission-control/data/field-ops/service-catalog.json"
  "mission-control/data/field-ops/templates.json"
)

# ─── Preflight checks ────────────────────────────────────────────────────────
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: Must be on main branch (currently on $CURRENT_BRANCH)"
  exit 1
fi

if ! git remote get-url public &>/dev/null; then
  echo "Error: 'public' remote not configured"
  exit 1
fi

# ─── Sync ─────────────────────────────────────────────────────────────────────
echo "=== Syncing main → public repo (incremental) ==="

# Stash any uncommitted changes (tracked files only — untracked may have
# Windows file locks from VS Code / file watchers)
STASHED=false
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  git stash -q
  STASHED=true
  echo "Stashed uncommitted changes"
fi

# Switch to public-launch (force to handle Windows file locks on untracked dirs)
git checkout -f public-launch -q

# Overlay ONLY whitelisted paths from main
echo "Overlaying whitelisted paths from main..."
for p in "${INCLUDE_PATHS[@]}"; do
  if git ls-tree -d main -- "$p" &>/dev/null || git ls-tree main -- "$p" &>/dev/null; then
    git checkout main -- "$p"
    echo "  + $p"
  fi
done

# Remove excluded files (private assets inside included dirs)
for f in "${EXCLUDE_FILES[@]}"; do
  if git ls-files --error-unmatch "$f" &>/dev/null 2>&1; then
    git rm -f "$f" -q
    echo "  - $f (excluded)"
  fi
done

# Restore personal data files from public-launch HEAD (keeps empty schemas)
echo "Restoring personal data files..."
for f in "${PERSONAL_DATA_FILES[@]}"; do
  if git show HEAD:"$f" &>/dev/null 2>&1; then
    # File exists on public-launch — restore the empty schema version
    git checkout HEAD -- "$f"
  else
    # File is new (not yet on public-launch) — write empty schema
    # Use -f to bypass .gitignore (data files may be ignored on main but tracked on public-launch)
    SCHEMA="${EMPTY_SCHEMAS[$f]:-}"
    if [ -n "$SCHEMA" ]; then
      echo "$SCHEMA" > "$f"
      git add -f "$f"
      echo "  [new] Initialized empty schema for $f"
    fi
  fi
done

# Warn about unrecognized data files in the staging area
echo "Checking for unknown data files..."
KNOWN_FILES=("${PERSONAL_DATA_FILES[@]}" "${SAFE_DATA_FILES[@]}")
while IFS= read -r f; do
  [ -z "$f" ] && continue
  FOUND=false
  for k in "${KNOWN_FILES[@]}"; do
    if [ "$f" = "$k" ]; then FOUND=true; break; fi
  done
  if [ "$FOUND" = false ]; then
    echo "  ⚠ Unknown data file: $f — add to PERSONAL_DATA_FILES or SAFE_DATA_FILES in sync-public.sh"
  fi
done < <(git diff --cached --name-only -- mission-control/data/ 2>/dev/null || true)

# Detect files deleted on main but still on public-launch (within whitelisted paths)
echo "Checking for deleted files..."
for p in "${INCLUDE_PATHS[@]}"; do
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if ! git ls-tree main -- "$f" &>/dev/null 2>&1; then
      # Skip personal data files — they're managed separately
      IS_PERSONAL=false
      for pf in "${PERSONAL_DATA_FILES[@]}"; do
        if [ "$f" = "$pf" ]; then IS_PERSONAL=true; break; fi
      done
      if [ "$IS_PERSONAL" = false ]; then
        git rm -f "$f" -q
        echo "  - $f (deleted on main)"
      fi
    fi
  done < <(git ls-tree -r --name-only HEAD -- "$p" 2>/dev/null || true)
done

# Remove any tracked files NOT under a whitelisted path (catches grandfathered files
# like docs/ and projects/ that were committed before the whitelist approach)
echo "Enforcing strict whitelist..."
while IFS= read -r f; do
  [ -z "$f" ] && continue
  IN_WHITELIST=false
  for p in "${INCLUDE_PATHS[@]}"; do
    if [ "$f" = "$p" ] || [[ "$f" == "$p/"* ]]; then
      IN_WHITELIST=true
      break
    fi
  done
  if [ "$IN_WHITELIST" = false ]; then
    git rm -f "$f" -q 2>/dev/null || true
    echo "  - $f (not in whitelist)"
  fi
done < <(git ls-files)

# Stage everything
git add -A

# Commit only if there are actual changes
if git diff --cached --quiet; then
  echo "No changes to sync. Skipping commit and push."
else
  CHANGED_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
  COMMIT_MSG="sync: $(date +%Y-%m-%d) — ${CHANGED_COUNT} files updated"
  git commit -m "$COMMIT_MSG" -q
  echo "Committed: $COMMIT_MSG"

  # ── Pre-push safety scan ──────────────────────────────────────────────────
  # Scan the commit diff for sensitive data patterns before pushing.
  # Aborts if anything suspicious is found — prevents accidental leaks.
  echo "Running pre-push safety scan..."
  DIFF_CONTENT=$(git diff HEAD~1..HEAD -- . ':!*.lock' ':!*.png' ':!*.svg' ':!scripts/sync-public.sh' 2>/dev/null || true)
  LEAK_FOUND=false
  LEAK_DETAILS=""

  # Pattern 1: Credential IDs (cred_xxxx)
  if echo "$DIFF_CONTENT" | grep -qE '^\+.*cred_[a-zA-Z0-9]{6,}'; then
    LEAK_FOUND=true
    LEAK_DETAILS+=$'\n  - Credential ID (cred_*) found in diff'
  fi

  # Pattern 2: Vault internals (hashes, salts, encrypted blobs)
  if echo "$DIFF_CONTENT" | grep -qE '^\+.*(masterKeyHash|masterKeySalt|encryptedData|"authTag"|"iv")'; then
    LEAK_FOUND=true
    LEAK_DETAILS+=$'\n  - Vault encryption data found in diff'
  fi

  # Pattern 3: Scrypt hashes
  if echo "$DIFF_CONTENT" | grep -qE '^\+.*scrypt:[a-f0-9]+'; then
    LEAK_FOUND=true
    LEAK_DETAILS+=$'\n  - Scrypt hash found in diff'
  fi

  # Pattern 4: Real API keys/tokens in JSON values (20+ char alphanumeric strings)
  # Only flag lines that look like key-value pairs with long secret values
  if echo "$DIFF_CONTENT" | grep -qE '^\+[[:space:]]*"(apiKey|apiSecret|accessToken|accessTokenSecret|clientSecret|apiKeySecret|bearerToken|refreshToken)":[[:space:]]*"[a-zA-Z0-9_-]{20,}"'; then
    LEAK_FOUND=true
    LEAK_DETAILS+=$'\n  - API key/token value found in diff'
  fi

  # Pattern 5: Real email addresses (exclude known safe patterns)
  REAL_EMAILS=$(echo "$DIFF_CONTENT" | grep -E '^\+.*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | \
    grep -vE '(noreply@|enteryouremail@|example\.com|youremail\.com|Co-Authored-By|dan@meisner\.dev)' || true)
  if [ -n "$REAL_EMAILS" ]; then
    LEAK_FOUND=true
    LEAK_DETAILS+=$'\n  - Real email address found in diff'
  fi

  if [ "$LEAK_FOUND" = true ]; then
    echo ""
    echo "❌ SAFETY SCAN FAILED — potential sensitive data detected:$LEAK_DETAILS"
    echo ""
    echo "The commit was created but NOT pushed. Review the diff with:"
    echo "  git diff HEAD~1..HEAD"
    echo ""
    echo "To push anyway (if you verified it's safe):"
    echo "  git push public public-launch:main"
    echo ""
    # Return to main before exiting
    git checkout -f main -q
    if [ "$STASHED" = true ]; then
      git stash pop -q
    fi
    exit 1
  fi
  echo "  ✓ No sensitive data detected"

  # Push incrementally (no --force)
  echo "Pushing to public remote..."
  git push public public-launch:main
  echo "✅ Public repo synced successfully"
fi

# Return to main (force to handle Windows file locks)
git checkout -f main -q
if [ "$STASHED" = true ]; then
  git stash pop -q
  echo "Restored stashed changes"
fi

echo "Done."
