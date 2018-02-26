FROM microsoft/azureiotedge-functions-binding:1.0-preview

ENV AzureWebJobsScriptRoot=/app

RUN apt-get update

RUN apt-get install -y unzip procps

RUN curl -sSL https://aka.ms/getvsdbgsh | bash /dev/stdin -v latest -l ~/vsdbg

COPY . /app