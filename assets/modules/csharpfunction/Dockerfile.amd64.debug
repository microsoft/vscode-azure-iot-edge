FROM microsoft/azureiotedge-functions-binding:1.0-preview

ENV AzureWebJobsScriptRoot=/app

RUN apt-get update && \
    apt-get install -y --no-install-recommends unzip procps && \
    curl -sSL https://aka.ms/getvsdbgsh | bash /dev/stdin -v latest -l ~/vsdbg && \
    rm -rf /var/lib/apt/lists/*

COPY . /app