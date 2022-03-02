FROM node:14.18.1-alpine3.14 as ts-compiler
RUN apk add --update tzdata
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
COPY . ./
CMD ["npm", "run", "start"]