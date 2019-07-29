---
title:  "knative 에서 Github에 있는 hello 앱 소스를 Build 컴포넌트로 빌드하고 서비스 배치 해보기"
date:   2019/06/10 13:04
categories: "cloud"
tags: ["recent"]
keywords: ["Knative","kubernetes","istio","install","쿠버네티스", "serverless"]
description: "Knative의 Build 컴포넌트는 git 같은 SCM에서 소스를 pull 하고 해당 소스로부터 컨테이너 이미지를 생성하여 레지스트리에 Push 하는 프로세스를 가지고 있습니다.. 이러한 일련의 Knatvie 빌드 프로세스를 간단한 hello 앱을 만들어 그 동작 원리를 확인해 보고자 합니다."
---


# knative 에서 Github에 있는 hello 앱 소스를 Build 컴포넌트로 빌드하고 서비스 배치 해보기 
---
*knative 0.6.*, *docker engine 18.06.2-ce*, *kubernetes 1.12.0*, *Istio 1.0.7*, *macOS Mojave 10.14.4(18E226)*


Knative의 _Build 컴포넌트_ 는 git 같은 SCM에서 소스를 pull 하고 해당 소스로부터 컨테이너 이미지를 생성하여 레지스트리에 Push 하는 프로세스를 가지고 있습니다. 이러한 일련의 Knative Build 프로세스를 간단한 hello 앱을 만들어 이를 통해 그 동작 원리를 확인해 보고자 합니다.


## 개요
***

진행 과정은 다음과 같다.

![Knative hello build Process](/resources/img/post/knative_hello_build_process.png)


### Knative Build의 구성

* **Build** : 하나의 빌드 프로세스는 여러단계의 스텝으로 구성되어 있으며 하나의 스텝에서는 Builder를 지정합니다.
* **Builder** : 컨테이너 이미지 형태로 빌드 프로세스 중 하나의 스텝 또는 전체를 담당하게 됩니다.
* **BuildTemplate** : 재사용 가능하도록 빌드 프로세스의 Template으로 정의합니다.
* **ServiceAccount** : 필요시 인증처리를 위해 사용


## 준비
***

* 예제 실행전에 아래와 같이 2가지 계정 및 _Repository_ 를 준비합니다.

1. Github 계정 및 Repository (public)
1. Docker Hub 계정 및 Repository (private)



## 개발 - Hello Server 어플 준비

* 문자열을 리턴하는 간단한 샘플 어플을 준비하고 Github Repository 에 _Push_ 합니다.
* [샘플 소스](https://github.com/itnpeople/knatvie_build_demo) 참조


* package.json

~~~
{
  "name": "hello-server",
  "version": "0.1.0",
  "description": "Example in Node",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "author": "",
  "license": "",
  "dependencies": {}
}
~~~

* server.js - 문자열을 리턴하는 nodejs 앱

~~~
var http = require('http');

http.createServer(function (request, response) {  
    response.writeHead(200, {'Content-Type' : 'text/plain'});
    response.write(`Hello server - Knative v0.2.1`);
    response.end();
}).listen(8080);
~~~

* Dockfile
  * node 이미지
  * npm install 로 dependency 설치 후 소스 복사
  * npm 으로 앱 실행

~~~
FROM node
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY . .
CMD [ "npm", "start" ]
~~~


## Build
***

### Docker Hub 계정 인증

* Docker Hub (https://hub.docker.com) 에 가입되어 있지 않다면 가입합니다.
* _Secret_ 과 _ServiceAccount_ 생성하고 _Secret_에 _DockerHub_ 계정과 비밀번호를 지정합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: docker-hub
  annotations:
    build.knative.dev/docker-0: https://index.docker.io/v1/
type: kubernetes.io/basic-auth
stringData:
  username: honester
  password: <password here>
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: build-bot
secrets:
- name: docker-hub
EOF
~~~

* _DockerHub_ 에 새로운 Repository를 아래와 같이 생성합니다.  
* 예제는 `<계정>/hello-server` 로 생성

![Docker Hub Repository](/resources/img/post/knative_hello_build_dockerhub1.png)


### build.yaml

* build.yaml 를 생성하고 적용합니다.

~~~
$ vi build.yaml
~~~

~~~
apiVersion: build.knative.dev/v1alpha1
kind: Build
metadata:
  name: hello-build
spec:
  serviceAccountName: build-bot
  source:
    git:
      url: https://github.com/itnpeople/knatvie_build_demo.git
      revision: master
  steps:
  - name: build
    image: docker:18.06
    env:
    - name: DOCKER_BUILDKIT
      value: "0"
    args: ["build", "-t", "honester/hello-server:v0.2.1", "."]
    volumeMounts:
    - name: docker-socket
      mountPath: /var/run/docker.sock
  - name: push
    image: docker:18.06
    args: ["push", "honester/hello-server:v0.2.1"]
    volumeMounts:
    - name: docker-socket
      mountPath: /var/run/docker.sock
  volumes:
  - name: docker-socket
    hostPath:
      path: /var/run/docker.sock
      type: Socket
~~~

* `source` 스펙을 통해 빌드할 hello-server 앱의 Github URL을 지정합니다.

* 예제 build.yaml은 아래와 같이 2개의 논리적인 step을 가지고 있습니다.

1. Github 에서 Pull 된  소스를 Docker Build 합니다.
1. Build 된 Docker Image를 Docker Hub로 Push 합니다.

### build.yaml 적용

* build.yaml을 적용하고 결과를 확인합니다.

~~~
$ kubectl apply -f build.yaml
$ kubectl get build

NAME          SUCCEEDED   REASON   STARTTIME   COMPLETIONTIME
hello-build   True                 2d
~~~

* 정상적으로 빌드가 되었다면 아래와 같이 _빌드 POD_ 가 생성되고 STATUS가 `Completed` 로 보여집니다.

~~~
$ kubectl get po

NAME                     READY   STATUS      RESTARTS   AGE
hello-build-pod-755593   0/1     Completed   0          2d17h
~~~

### 빌드 POD 확인

* 앞서 살펴본 것과 같이 build.yaml 이 정상 실행되었다면 _빌드 POD_ 가 생성됩니다.
* 만일 빌드 과정 중 오류가 발생하였다면 `kubectl describe` 명령으로 대상 _POD_ 의 initContainer 수행 상태를 확인을 통해 문제를 해결합니다.
* 아래는 정상 처리된 _빌드 POD_ 의 Init Containers 로 실제로는 아래와 같이 4개의 step 이 진행된 것을 확인할 수 있습니다.

1. **build-step-credential-initializer** : _Docker Hub_ 인증 초기화
1. **build-step-git-source-0** : 대상 소스 Github으로부터 Pull
1. **build-step-build** : Docker Image 빌드
1. **build-step-push** : 빌드된 Image _Docker Hub_ 로 Push

~~~
$ kubectl describe po hello-build-pod-755593

....

Init Containers:
  build-step-credential-initializer:
    Container ID:  docker://f030028aa58cb330da991e781bd961797db79226acd6efdf7ddd6af1274f0ef2
    Image:         gcr.io/knative-releases/github.com/knative/build/cmd/creds-init@sha256:ebf58f848c65c50a7158a155db7e0384c3430221564c4bbaf83e8fbde8f756fe
    Image ID:      docker-pullable://gcr.io/knative-releases/github.com/knative/build/cmd/creds-init@sha256:ebf58f848c65c50a7158a155db7e0384c3430221564c4bbaf83e8fbde8f756fe
    Port:          <none>
    Host Port:     <none>
    Args:
      -basic-docker=docker-hub=https://index.docker.io/v1/
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Fri, 07 Jun 2019 17:32:45 +0900
      Finished:     Fri, 07 Jun 2019 17:32:45 +0900
    Ready:          True
    Restart Count:  0
    Environment:
      HOME:  /builder/home
    Mounts:
      /builder/home from home (rw)
      /var/build-secrets/docker-hub from secret-volume-docker-hub (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from build-bot-token-wntrj (ro)
      /workspace from workspace (rw)
  build-step-git-source-0:
    Container ID:  docker://794938c396e874f9344c92c35f417fcf5db0e6a4478c22faa9c9d131f5217ff6
    Image:         gcr.io/knative-releases/github.com/knative/build/cmd/git-init@sha256:09f22919256ba4f7451e4e595227fb852b0a55e5e1e4694cb7df5ba0ad742b23
    Image ID:      docker-pullable://gcr.io/knative-releases/github.com/knative/build/cmd/git-init@sha256:09f22919256ba4f7451e4e595227fb852b0a55e5e1e4694cb7df5ba0ad742b23
    Port:          <none>
    Host Port:     <none>
    Args:
      -url
      https://github.com/itnpeople/knatvie_build_demo.git
      -revision
      master
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Fri, 07 Jun 2019 17:32:47 +0900
      Finished:     Fri, 07 Jun 2019 17:32:49 +0900
    Ready:          True
    Restart Count:  0
    Environment:
      HOME:  /builder/home
    Mounts:
      /builder/home from home (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from build-bot-token-wntrj (ro)
      /workspace from workspace (rw)
  build-step-build:
    Container ID:  docker://d22a271ac513e7589f60f05f29ac19d5933283126c34902e912a5a91b7c05e77
    Image:         docker:18.06
    Image ID:      docker-pullable://docker@sha256:d0ae46aa08806ffc1c4de70a4eb585df33470643a9d2ccf055ff3ec91ba5b0b0
    Port:          <none>
    Host Port:     <none>
    Args:
      build
      -t
      honester/hello-server:v0.2.1
      .
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Fri, 07 Jun 2019 17:32:50 +0900
      Finished:     Fri, 07 Jun 2019 17:32:51 +0900
    Ready:          True
    Restart Count:  0
    Environment:
      HOME:             /builder/home
      DOCKER_BUILDKIT:  0
    Mounts:
      /builder/home from home (rw)
      /var/run/docker.sock from docker-socket (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from build-bot-token-wntrj (ro)
      /workspace from workspace (rw)
  build-step-push:
    Container ID:  docker://d8e358229a92d5e886783e41ef6a85d41a3c20f03d1f7bfb8e160a3d62ad63db
    Image:         docker:18.06
    Image ID:      docker-pullable://docker@sha256:d0ae46aa08806ffc1c4de70a4eb585df33470643a9d2ccf055ff3ec91ba5b0b0
    Port:          <none>
    Host Port:     <none>
    Args:
      push
      honester/hello-server:v0.2.1
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Fri, 07 Jun 2019 17:32:53 +0900
      Finished:     Fri, 07 Jun 2019 17:33:08 +0900
    Ready:          True
    Restart Count:  0
    Environment:
      HOME:  /builder/home
    Mounts:
      /builder/home from home (rw)
      /var/run/docker.sock from docker-socket (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from build-bot-token-wntrj (ro)
      /workspace from workspace (rw)

...
~~~


* 아래 그림에서와 같이 _Docker Hub_ 에서 Build & Push 된 Image 를 확인할 수 있습니다.

![Docker Hub Repositry Image List](/resources/img/post/knative_hello_build_dockerhub2.png)


## Service
***

* 이제 Service를 생성해 해당 이미지를 배치합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1alpha1
kind: Service
metadata:
  name: hello-server
  namespace: default
spec:
  template:
    spec:
      containers:
        - image: honester/hello-server:v0.2.1
EOF
~~~


* 정상적으로 서비스되고 있는지 확인하기 위해 `port-forward` 하고 curl로 서비스를 호출해 결과를 확인합니다.

~~~
$ kubectl port-forward svc/istio-ingressgateway -n istio-system 8000:80

$ curl -H "HOST: $(kubectl get route hello-server  -o jsonpath='{.status.domain}')" http://localhost:8000

Hello server - Knative v0.2.1
~~~

* 요청 처리를 위해서 아래와 같이 hello-server _POD_ 이 새로 생성됩니다.
* 생성된 _POD_ 은 사용이 없으면 자동으로 제거됩니다.

~~~
$ kubectl get po

NAME                                             READY   STATUS      RESTARTS   AGE
hello-build-pod-755593                           0/1     Completed   0          2d17h
hello-server-s2f7f-deployment-7494f7854b-689pb   3/3     Running     0          22s
~~~

## 참조
***

* https://knative.dev/docs/build/
* https://knative.club/
* https://www.youtube.com/watch?v=KDWvN8q2FEU&t=1444s


## 마치며
***

예제를 통해 Github 에 hello 앱을 Pull하고 Docker 빌드를 통하여 생성된 Container Image를  Public 레지스트리에 Push 하였고 해당 이미지를 Knative Service 로 배치를 통해 Knative 의 Build-Serving 원리를 확인해 보았습니다.

예제에서는 이해를 쉽게하기 위해 Pure Docker 빌드를 사용하였지만 일반적으로는 bazel, buildkit, buildpacks, Kaniko 의 [Build Template](https://github.com/knative/build-templates) 를 활용한다면 보다 손쉬운 Knative 빌드를 활용할 수 있을것 같습니다.

