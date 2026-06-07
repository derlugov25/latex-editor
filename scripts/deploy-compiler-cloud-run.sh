#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT}"
REGION="${GOOGLE_CLOUD_REGION:-europe-west3}"
SERVICE="${COMPILER_SERVICE_NAME:-latex-compiler}"
REPOSITORY="${ARTIFACT_REPOSITORY:-latex-editor}"
SECRET_NAME="${COMPILER_SECRET_NAME:-latex-compiler-api-key}"
API_KEY="${COMPILER_API_KEY:?Set COMPILER_API_KEY}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/compiler:$(date -u +%Y%m%d%H%M%S)"

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID"

if ! gcloud artifacts repositories describe "$REPOSITORY" \
  --location "$REGION" \
  --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format docker \
    --location "$REGION" \
    --project "$PROJECT_ID"
fi

gcloud builds submit . \
  --config apps/compiler/cloudbuild.yaml \
  --project "$PROJECT_ID" \
  --timeout 30m \
  --substitutions "_IMAGE=${IMAGE}"

if gcloud secrets describe "$SECRET_NAME" \
  --project "$PROJECT_ID" >/dev/null 2>&1; then
  printf '%s' "$API_KEY" | gcloud secrets versions add "$SECRET_NAME" \
    --data-file=- \
    --project "$PROJECT_ID"
else
  printf '%s' "$API_KEY" | gcloud secrets create "$SECRET_NAME" \
    --data-file=- \
    --replication-policy automatic \
    --project "$PROJECT_ID"
fi

SECRET_VERSION="$(
  gcloud secrets versions list "$SECRET_NAME" \
    --filter 'state=ENABLED' \
    --sort-by '~createTime' \
    --limit 1 \
    --format 'value(name)' \
    --project "$PROJECT_ID"
)"
DEFAULT_RUNTIME_SERVICE_ACCOUNT="${SERVICE}-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SERVICE_ACCOUNT="${CLOUD_RUN_SERVICE_ACCOUNT:-${DEFAULT_RUNTIME_SERVICE_ACCOUNT}}"

if [[ "$RUNTIME_SERVICE_ACCOUNT" == "$DEFAULT_RUNTIME_SERVICE_ACCOUNT" ]] &&
  ! gcloud iam service-accounts describe "$RUNTIME_SERVICE_ACCOUNT" \
    --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SERVICE}-runtime" \
    --display-name "LaTeX compiler Cloud Run runtime" \
    --project "$PROJECT_ID"
  # Allow the new identity to propagate before binding the secret policy.
  sleep 10
fi

gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member "serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
  --role roles/secretmanager.secretAccessor \
  --project "$PROJECT_ID" >/dev/null

gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --cpu 1 \
  --memory 2Gi \
  --concurrency 1 \
  --timeout 300 \
  --max-instances 3 \
  --service-account "$RUNTIME_SERVICE_ACCOUNT" \
  --set-env-vars "COMPILER_MAX_SOURCE_BYTES=2097152,COMPILER_PASS_TIMEOUT_MS=60000" \
  --set-secrets "COMPILER_API_KEY=${SECRET_NAME}:${SECRET_VERSION}"

gcloud run services describe "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format 'value(status.url)'
