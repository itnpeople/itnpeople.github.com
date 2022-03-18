---
title:  Nuxt Framework
date:   2022/03/18 9:42
categories: "tip"
tags: ["vuejs","next","framework"]
keywords: ["vuejs","next","framework"]
description: Development Tips - Nuxt Framework
---

# {{ page.title }}

**Table of Contents**

* [Config](#config)
* [Integration](#integration)


## Config

### Front-End runtime environment (version 2.13+ 이후)
https://nuxtjs.org/blog/moving-from-nuxtjs-dotenv-to-runtime-config

* version : 2.14.11

* nuxt.config

```
export default {
  publicRuntimeConfig: {
    backendPort: process.env.BACKEND_PORT || "3001",
    dashboardPort: process.env.DASHBOARD_PORT || "9090",
    kialiRootUrl: process.env.KIALI_PORT || "20001",
  },
...
```

* Dockerfile

```
# #-------------------------------------------
# # STEP 1 : build executable binary
# #-------------------------------------------
FROM node:14.14.0-alpine3.12 as builder

ADD . /usr/src/app

WORKDIR /usr/src/app

RUN npm install
RUN npm run build:frontend

#-------------------------------------------
# STEP 2 : build a image
#-------------------------------------------
FROM node:14.14.0-alpine3.12

COPY --from=builder /usr/src/app/.nuxt /app/.nuxt
COPY --from=builder /usr/src/app/nuxt.config.js /app/nuxt.config.js
COPY --from=builder /usr/src/app/package.json /app/package.json

WORKDIR /app
RUN npm install --only=production

ENV HOST 0.0.0.0
ENV BACKEND_PORT 3001
ENV DASHBOARD_PORT 9090
ENV KIALI_PORT 20001

ENTRYPOINT [ "npm", "run", "run" ]
EXPOSE 3000
```


## Integration

### jQuery

* package.json

```
    "devDependencies": {
        "jquery": "3.4.1",
    },
```

* *.vue

```
import "expose-loader?$!expose-loader?jQuery!jquery"
```