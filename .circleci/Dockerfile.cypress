FROM cypress/browsers:chrome67

ENV APP /usr/src/app
WORKDIR $APP

COPY package.json $APP/package.json
RUN npm run cypress:install > /dev/null

COPY client/cypress $APP/client/cypress
COPY cypress.json $APP/cypress.json

RUN ./node_modules/.bin/cypress verify
