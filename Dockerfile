FROM jrottenberg/ffmpeg:4.4-ubuntu as ffmpeg
# FROM node:20.11.1 as build

# WORKDIR /app
# COPY package*.json ./
# RUN npm install

FROM node:20.11.1 as app

WORKDIR /app

ENV LD_LIBRARY_PATH=/usr/local/lib

COPY --from=ffmpeg /usr/local /usr/local/
COPY --from=ffmpeg /lib/*-linux-gnu/* /usr/lib/

# COPY --from=build /app/node_modules ./node_modules

RUN chown node:node /app
USER node

ENTRYPOINT bash