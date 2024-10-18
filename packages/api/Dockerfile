FROM oven/bun:1.1.31 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production

# copy production dependencies and source code into final image
FROM base AS release
RUN apt update && apt install -y ffmpeg
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=prerelease /usr/src/app .

RUN mkdir -p /usr/src/app/data
RUN chown -R bun:bun /usr/src/app/data

# run the app
USER bun
ENTRYPOINT [ "bash", "scripts/run.sh" ]
