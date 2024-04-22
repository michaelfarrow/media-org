FROM jrottenberg/ffmpeg:4.4-vaapi as ffmpeg


FROM node:20.11.1 as build

WORKDIR /app

ADD app/src ./src
COPY app/*.ts ./
COPY app/*.json ./
RUN npm install
RUN npm run build


FROM node:20.11.1-slim as common

WORKDIR /app

RUN echo "deb http://http.us.debian.org/debian stable main contrib non-free" | tee -a /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y shntool flac cuetools
RUN apt-get install -y i965-va-driver-shaders
RUN apt-get install -y mkvtoolnix

ENV LD_LIBRARY_PATH=/usr/local/lib
COPY --from=ffmpeg /usr/local /usr/local/
COPY --from=ffmpeg /lib/*-linux-gnu/* /usr/lib/

RUN groupadd --gid 105 render
RUN usermod -aG render node
RUN usermod -aG video node

RUN chown node:node /app
USER node

ENTRYPOINT bash


FROM common as dev


FROM common as dist

COPY --from=build /app/node_modules/@img ./node_modules/@img
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/typo-js/dictionaries /app/dist/dictionaries
COPY ./app/music /usr/local/bin/music
COPY ./app/movies /usr/local/bin/movies
COPY ./app/split /usr/local/bin/split

WORKDIR /media
