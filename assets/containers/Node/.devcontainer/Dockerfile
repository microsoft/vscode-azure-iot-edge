# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.194.0/containers/javascript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 16, 14, 12
ARG VARIANT="16-buster"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# Install Docker CE
COPY library-scripts/*.sh /tmp/library-scripts/
RUN \
    apt-get update -y \
    # Use Docker script from script library to set things up - enable non-root docker, user vscode, using moby
    && /bin/bash /tmp/library-scripts/docker-in-docker-debian.sh "true" "automatic" "true" \
    # install iotedgehubdev
    && apt-get install -y python3-pip && pip3 install --upgrade pip && pip install iotedgehubdev \
    # Clean up
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/* /tmp/library-scripts/

# [Optional] Uncomment this line to install global node packages.
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

RUN npm install -g yo@latest generator-azure-iot-edge-module

# launch docker-ce
ENTRYPOINT [ "/usr/local/share/docker-init.sh" ]
CMD [ "sleep", "infinity" ]
