# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.194.0/containers/java/.devcontainer/base.Dockerfile

# [Choice] Java version: 11, 16
ARG VARIANT="16"
FROM mcr.microsoft.com/vscode/devcontainers/java:0-${VARIANT}

# [Option] Install Maven
ARG INSTALL_MAVEN="false"
ARG MAVEN_VERSION=""
RUN if [ "${INSTALL_MAVEN}" = "true" ]; then su vscode -c "umask 0002 && . /usr/local/sdkman/bin/sdkman-init.sh && sdk install maven \"${MAVEN_VERSION}\""; fi

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

# launch docker-ce
ENTRYPOINT [ "/usr/local/share/docker-init.sh" ]
CMD [ "sleep", "infinity" ]
