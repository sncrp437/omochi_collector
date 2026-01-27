#!/bin/bash
git pull
# Unset all variables in .env.local
if [ -f .env ]; then
  echo "Unsetting variables from .env.local..."
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ ! "$line" =~ ^#.*$ && -n "$line" ]]; then
      var_name=$(echo "$line" | cut -d= -f1)
      unset "$var_name"
    fi
  done < .env
fi

# Set all variables from .env.dev
if [ -f .env.dev ]; then
  echo "Setting variables from .env.dev ..."
  set -a
  source .env.dev
  set +a
fi

# Remove current requirements.txt
echo "Removing current requirements.txt..."
rm -f requirements.txt

# Extract non-dev packages from uv lock to requirements.txt
echo "Extracting non-dev packages to requirements.txt..."
uv sync --no-dev
uv pip install -e .
uv pip freeze > requirements.txt

# Check if requirements.txt was created successfully
if [ ! -f requirements.txt ]; then
  echo "Failed to create requirements.txt. Exiting."
  exit 1
fi

# Run Serverless deploy
echo "Deploying with Serverless Framework..."
sls deploy

echo "migrating database..."
sls wsgi manage --command "migrate"

echo "seeding database..."
sls --stage dev wsgi manage --command "seed_db"

echo "Deployment completed."