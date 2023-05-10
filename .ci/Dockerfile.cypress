FROM cypress/browsers:node14.17.0-chrome91-ff89

ENV APP /usr/src/app
WORKDIR $APP

COPY package.json yarn.lock .yarnrc $APP/
COPY viz-lib $APP/viz-lib
RUN npm install yarn@1.22.10 -g && yarn --frozen-lockfile --network-concurrency 1 > /dev/null

COPY . $APP

RUN ./node_modules/.bin/cypress verify
