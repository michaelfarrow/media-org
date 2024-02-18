FROM node:20.11.1

RUN apt-get update
RUN apt-get install -y ffmpeg

USER node
WORKDIR /app

ENTRYPOINT bash