FROM mhart/alpine-node:10 as base
WORKDIR /usr/src
COPY . /usr/src
RUN apk update && apk upgrade && apk add --no-cache git
RUN yarn
EXPOSE 3000
CMD ["yarn", "start"]

