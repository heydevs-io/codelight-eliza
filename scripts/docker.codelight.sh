#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 {build|run|start|bash}"
    exit 1
fi

# Execute the corresponding command based on the argument
case "$1" in
build)
    docker build --platform linux/amd64 -t codelight-eliza -f Dockerfile.codelight .
    ;;
run)
    # Add environment variables with defaults
    PORT=${PORT:-3000}
    CONTAINER_NAME=${CONTAINER_NAME:-codelight-eliza}
    ENV_FILE=${ENV_FILE:-.env}
    CHARACTER_FILE=${CHARACTER_FILE:-characters/solana-princess.character.json}

    # Ensure the container is not already running
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo "Container '$CONTAINER_NAME' is already running. Stopping it first."
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi

    # Define base directories to mount
    BASE_MOUNTS=(
        "characters:/app/characters"
        "$ENV_FILE:/app/.env"
        "agent:/app/agent"
        "docs:/app/docs"
        "scripts:/app/scripts"
    )

    # Define package directories to mount
    PACKAGES=(
        "adapter-postgres"
        "adapter-sqlite"
        "adapter-sqljs"
        "adapter-supabase"
        "client-auto"
        "client-direct"
        "client-discord"
        "client-farcaster"
        "client-telegram"
        "client-twitter"
        "core"
        "plugin-bootstrap"
        "plugin-image-generation"
        "plugin-node"
        "plugin-solana"
        "plugin-evm"
        "plugin-tee"

        # Codelight
        "client-twitter-codelight"
    )

    # Start building the docker run command
    CMD="docker run -p $PORT:3000 -d"

    # Add base mounts
    for mount in "${BASE_MOUNTS[@]}"; do
        CMD="$CMD -v \"$(pwd)/$mount\""
    done

    # Add package mounts
    for package in "${PACKAGES[@]}"; do
        CMD="$CMD -v \"$(pwd)/packages/$package/src:/app/packages/$package/src\""
    done

    # Add core types mount separately (special case)
    CMD="$CMD -v \"$(pwd)/packages/core/types:/app/packages/core/types\""

    # Add container name and image
    CMD="$CMD --name $CONTAINER_NAME codelight-eliza pnpm start --non-interactive --character=$CHARACTER_FILE"

    # Execute the command
    eval $CMD
    ;;
# start)
#     docker start codelight-eliza
#     ;;
# bash)
#     # Check if the container is running before executing bash
#     if [ "$(docker ps -q -f name=codelight-eliza)" ]; then
#         docker exec -it codelight-eliza bash
#     else
#         echo "Container 'codelight-eliza' is not running. Please start it first."
#         exit 1
#     fi
#     ;;
*)
    echo "Invalid option: $1"
    echo "Usage: $0 {build|run|start|bash}"
    exit 1
    ;;
esac
