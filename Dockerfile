FROM jrottenberg/ffmpeg:4.4-ubuntu as ffmpeg


FROM node:20.11.1 as build

WORKDIR /app

ADD app/src ./src
COPY app/*.ts ./
COPY app/*.json ./
RUN npm install
RUN npm run build


FROM node:20.11.1 as common

WORKDIR /app

RUN apt-get update
RUN apt-get install -y shntool flac cuetools

ENV LD_LIBRARY_PATH=/usr/local/lib
COPY --from=ffmpeg /usr/local /usr/local/
COPY --from=ffmpeg /lib/*-linux-gnu/* /usr/lib/

RUN chown node:node /app
USER node

ENTRYPOINT bash


FROM common as dev


FROM common as dist

COPY --from=build /app/node_modules/@img ./node_modules/@img
COPY --from=build /app/dist ./dist
COPY ./app/cli /usr/local/bin/cli
COPY ./app/split /usr/local/bin/split

WORKDIR /media
