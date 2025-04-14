FROM gcr.io/datadoghq/agent:7 as datadog-agent

FROM node:16

COPY --from=datadog-agent /opt/datadog-agent /opt/datadog-agent

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PATH="/opt/datadog-agent/bin:/opt/datadog-agent/embedded/bin:${PATH}"

CMD [\"/bin/bash\", \"-c\", \"datadog-agent run & npm start\"]
