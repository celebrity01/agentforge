#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AgentForge - Deploy to GitHub & Vercel
# =============================================================================
# Usage:
#   ./deploy.sh --github-token <TOKEN> --vercel-token <TOKEN> [--repo-name <NAME>] [--public]
#
# Prerequisites:
#   - GitHub Personal Access Token (scopes: repo, read:org, gist)
#     Create at: https://github.com/settings/tokens/new
#   - Vercel Token
#     Create at: https://vercel.com/account/tokens
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

GITHUB_TOKEN=""
VERCEL_TOKEN=""
REPO_NAME="agentforge"
VISIBILITY="private"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --github-token)
      GITHUB_TOKEN="$2"
      shift 2
      ;;
    --vercel-token)
      VERCEL_TOKEN="$2"
      shift 2
      ;;
    --repo-name)
      REPO_NAME="$2"
      shift 2
      ;;
    --public)
      VISIBILITY="public"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 --github-token <TOKEN> --vercel-token <TOKEN> [--repo-name <NAME>] [--public]"
      echo ""
      echo "Options:"
      echo "  --github-token   GitHub Personal Access Token (required)"
      echo "  --vercel-token   Vercel API Token (required)"
      echo "  --repo-name      GitHub repository name (default: agentforge)"
      echo "  --public         Make the repository public (default: private)"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║         AgentForge Deployment Script         ║"
echo "  ║    OpenManus + Gemini CLI Unified Interface   ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Validate tokens
if [[ -z "$GITHUB_TOKEN" ]]; then
  echo -e "${RED}Error: GitHub token is required.${NC}"
  echo -e "Create one at: ${YELLOW}https://github.com/settings/tokens/new${NC}"
  echo -e "Required scopes: repo, read:org, gist"
  echo ""
  echo -e "Usage: $0 --github-token <TOKEN> --vercel-token <TOKEN>"
  exit 1
fi

if [[ -z "$VERCEL_TOKEN" ]]; then
  echo -e "${RED}Error: Vercel token is required.${NC}"
  echo -e "Create one at: ${YELLOW}https://vercel.com/account/tokens${NC}"
  echo ""
  echo -e "Usage: $0 --github-token <TOKEN> --vercel-token <TOKEN>"
  exit 1
fi

# ─── Step 1: Authenticate with GitHub ────────────────────────────────────
echo -e "${BLUE}[1/6]${NC} Authenticating with GitHub..."

echo "$GITHUB_TOKEN" | gh auth login --with-token --hostname github.com 2>&1
GH_USER=$(gh api user -q '.login' 2>&1)
echo -e "${GREEN}✓ Authenticated as: $GH_USER${NC}"

# ─── Step 2: Create GitHub Repository ────────────────────────────────────
echo -e "${BLUE}[2/6]${NC} Creating GitHub repository: $REPO_NAME..."

if gh repo view "$GH_USER/$REPO_NAME" &>/dev/null; then
  echo -e "${YELLOW}⚠ Repository $GH_USER/$REPO_NAME already exists. Using existing repo.${NC}"
else
  VISIBILITY_FLAG="--private"
  if [[ "$VISIBILITY" == "public" ]]; then
    VISIBILITY_FLAG="--public"
  fi

  gh repo create "$REPO_NAME" $VISIBILITY_FLAG \
    --description "AgentForge - Unified OpenManus + Gemini CLI Interface" \
    --source "$PROJECT_DIR" \
    --push 2>&1

  echo -e "${GREEN}✓ Repository created: https://github.com/$GH_USER/$REPO_NAME${NC}"
fi

# ─── Step 3: Set Git Remote & Push ───────────────────────────────────────
echo -e "${BLUE}[3/6]${NC} Setting up git remote and pushing code..."

cd "$PROJECT_DIR"

# Check if remote already exists
if git remote get-url origin &>/dev/null; then
  CURRENT_REMOTE=$(git remote get-url origin)
  if [[ "$CURRENT_REMOTE" != *"github.com/$GH_USER/$REPO_NAME"* ]]; then
    git remote set-url origin "https://github.com/$GH_USER/$REPO_NAME.git"
  fi
else
  git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
fi

# Push to GitHub
git push -u origin main 2>&1
echo -e "${GREEN}✓ Code pushed to GitHub${NC}"

# ─── Step 4: Set GitHub Secrets for CI/CD ────────────────────────────────
echo -e "${BLUE}[4/6]${NC} Setting up GitHub secrets for Vercel deployment..."

# Get Vercel account info
VERCEL_USER=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v2/user" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('uid',''))" 2>/dev/null || echo "")

if [[ -n "$VERCEL_USER" ]]; then
  # Create Vercel project
  echo -e "${BLUE}  Creating Vercel project...${NC}"
  
  VERCEL_PROJECT=$(curl -s -X POST "https://api.vercel.com/v9/projects" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$REPO_NAME\",
      \"framework\": \"nextjs\",
      \"gitRepository\": {
        \"type\": \"github\",
        \"repo\": \"$GH_USER/$REPO_NAME\"
      },
      \"buildCommand\": \"bun run build\",
      \"installCommand\": \"bun install\",
      \"devCommand\": \"bun run dev\",
      \"rootDirectory\": \".\"
    }" 2>&1)

  VERCEL_PROJECT_ID=$(echo "$VERCEL_PROJECT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null || echo "")
  VERCEL_ORG_ID=$(echo "$VERCEL_PROJECT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('orgId',''))" 2>/dev/null || echo "")

  if [[ -n "$VERCEL_PROJECT_ID" ]]; then
    echo -e "${GREEN}✓ Vercel project created (ID: $VERCEL_PROJECT_ID)${NC}"

    # Set GitHub secrets for CI/CD
    gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" --repo "$GH_USER/$REPO_NAME" 2>&1
    gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" --repo "$GH_USER/$REPO_NAME" 2>&1
    gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" --repo "$GH_USER/$REPO_NAME" 2>&1
    echo -e "${GREEN}✓ GitHub secrets configured${NC}"
  else
    echo -e "${YELLOW}⚠ Could not create Vercel project via API. You may need to connect manually.${NC}"
    echo -e "  Visit: ${YELLOW}https://vercel.com/new${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Could not verify Vercel account. Setting up secrets anyway...${NC}"
fi

# ─── Step 5: Deploy to Vercel ────────────────────────────────────────────
echo -e "${BLUE}[5/6]${NC} Deploying to Vercel..."

cd "$PROJECT_DIR"

# Deploy using Vercel CLI with token
vercel deploy --prod --token "$VERCEL_TOKEN" --yes 2>&1

echo -e "${GREEN}✓ Deployed to Vercel${NC}"

# ─── Step 6: Set Environment Variables on Vercel ─────────────────────────
echo -e "${BLUE}[6/6]${NC} Setting up environment variables on Vercel..."

if [[ -n "$VERCEL_PROJECT_ID" ]]; then
  # Prompt user for OAuth env vars (or leave empty for now)
  echo -e "${YELLOW}⚠ Remember to set these environment variables in your Vercel dashboard:${NC}"
  echo -e "  ${BLUE}GOOGLE_CLIENT_ID${NC}     - Your Google OAuth Client ID"
  echo -e "  ${BLUE}GOOGLE_CLIENT_SECRET${NC} - Your Google OAuth Client Secret"
  echo -e "  ${BLUE}GEMINI_REDIRECT_URI${NC}  - OAuth callback URL (https://your-domain.vercel.app/api/auth/gemini/callback)"
  echo -e "  ${BLUE}GEMINI_API_KEY${NC}       - Optional: Gemini API key fallback"
  echo ""
  echo -e "  Set them at: ${YELLOW}https://vercel.com/dashboard -> $REPO_NAME -> Settings -> Environment Variables${NC}"
fi

# ─── Summary ──────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗"
echo -e "║         Deployment Complete! 🚀              ║"
echo -e "╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}GitHub:${NC}     https://github.com/$GH_USER/$REPO_NAME"
echo -e "  ${BLUE}Vercel:${NC}     https://vercel.com/dashboard"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Set up Google OAuth: https://console.cloud.google.com/apis/credentials"
echo -e "  2. Add environment variables in Vercel dashboard"
echo -e "  3. Update GEMINI_REDIRECT_URI to match your Vercel domain"
echo -e "  4. Redeploy after setting env vars: git commit --allow-empty -m 'trigger deploy' && git push"
