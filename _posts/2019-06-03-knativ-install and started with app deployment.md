---
title:  "[Knative] minikube에 Knative 설치해보고 처음으로 앱 배포해보기"
date:   2019/06/03 13:35
categories: "cloud"
tags: ["recent"]
keywords: ["Knative","kubernetes","istio","install","쿠버네티스","이스티오","minikube","serverless"]
description: "Knativ는 AWS의 람다(Lambda)나, Google의 펑션(Function) 같은 Serverless 서비스를 할 수 있도록 워크로드를 구축 및 관리하는 Kubernetes 기반 오픈소스 플랫폼이다. 이에 minikuke를 활용해 로컬에 설치해보고 샘플 앱을 배포 및 실행을 통해 Knative 의 개념 및 동작원리를 이해하고 Knative 하에서 Blue/Green Deployment 가 어떤 방식으로 정의되고 동작되는지 확인해 보고자 한다."
---

# Knative - minikube에 Knative 설치해보고 처음으로 앱 배포해보기
---
*knative 0.6.*, *docker engine 18.06.2-ce*, *kubernetes 1.12.0*, *Istio 1.0.7*, *minikube v1.0.0* , *macOS Mojave 10.14.4(18E226)*

Knativ는 AWS의 람다(Lambda)나, Google의 펑션(Function) 같은 Serverless 서비스를 할 수 있도록 워크로드를 구축 및 관리하는 Kubernetes 기반 오픈소스 플랫폼이다.
이에 minikuke를 활용해 로컬에 설치해보고 샘플 앱을 배포 및 실행을 통해 Knative 의 개념 및 동작원리를 이해하고 Knative 하에서 Blue/Green Deployment 가 어떤 방식으로 정의되고 동작되는지 확인해 보고자 한다.


## Install

### 개요

* with Istio, with Gloo  두가지 인스톨 방법이 있음

* Gloo 는 envoy-based  api gateway 로 Knative "Eventing" 컴포넌트를 지원하지 않으며 서비스메시를 필요로하지 않거나 lightweight 한 기능만 필요할 경우 사용

* Installing Knative with Istio

  * Comprehensive Install - 포괄적 설치
  * Limited Install -  observability plugin 제외, disk space 최소화 설치
  * Custom Install - 컴포넌트와 and observability plugin 선택 설치

* v0.6 공식 문서 Install 가이드에 따라 MacOS에서 아래와 같이 VirtualBox 및 K8s v1.14.0 환경으로 클러스터를 생성하고 설치를 진행했지만 성공하지 못했다.

~~~
$ minikube start --memory=8192 --cpus=6 --disk-size=30g  -p knative
~~~

* "Comprehensive Install"은 Request 가 크기 때문에 minikube 에서 설치는 불가능했을 뿐만 아니라 VirtualBox, K8s 버전에 따라 설치가 진행되지 않아서 아래와 같이 몇가지 조정해 주었다.

  * memory를 8g 에서 10g로 cpu 6에서 8로 업그레이드
  * Event, Monitoring 컴포넌트 제외
  * apiserver.enable-admission-plugins 모두 제외
  * VirtualBox 대신 hyperkit 드라이버 사용 (공식문서)
  * K8s v1.12.0 로 다운그레이드 (공식문서)


### 클러스터 생성

* hyperkit 드라이버 설치

~~~
$ brew install hyperkit

$ curl -LO https://storage.googleapis.com/minikube/releases/latest/docker-machine-driver-hyperkit \
&& sudo install -o root -g wheel -m 4755 docker-machine-driver-hyperkit /usr/local/bin/
~~~

* minikube 클러스터 생성

~~~
$ minikube start --memory=10240 --cpus=8 --disk-size=30g -p knative \
  --kubernetes-version=v1.12.0 \
  --vm-driver=hyperkit
~~~


### Istio 설치

*  Istio  LoadBalancer 를 NodePort로 변경

~~~
$ kubectl apply -f https://raw.githubusercontent.com/knative/serving/v0.5.2/third_party/istio-1.0.7/istio-crds.yaml

$ curl -L https://raw.githubusercontent.com/knative/serving/v0.5.2/third_party/istio-1.0.7/istio.yaml \
  | sed 's/LoadBalancer/NodePort/' \
  | kubectl apply -f -
~~~

* 파드 Running/Complete 상태 확인

~~~
$ kubectl get pods -n istio-system --watch
~~~


* sidecar injection

~~~
$ kubectl label namespace default istio-injection=enabled
~~~


### Install Knative

* Knative CRDs 등록

~~~
$ kubectl apply --selector knative.dev/crd-install=true \
-f https://github.com/knative/serving/releases/download/v0.6.0/serving.yaml \
-f https://github.com/knative/build/releases/download/v0.5.0/build.yaml \
-f https://raw.githubusercontent.com/knative/serving/v0.6.0/third_party/config/build/clusterrole.yaml
~~~

* Knative 설치 (Event 컴포넌트 제외)

~~~
$ kubectl apply --selector networking.knative.dev/certificate-provider!=cert-manager \
-f https://github.com/knative/serving/releases/download/v0.6.0/serving.yaml \
-f https://github.com/knative/build/releases/download/v0.5.0/build.yaml \
-f https://raw.githubusercontent.com/knative/serving/v0.6.0/third_party/config/build/clusterrole.yaml
~~~

* 파드 Running/Complete 상태 확인

~~~
$ kubectl get pod --all-namespaces --watch
~~~

## 샘플 앱 (_helloworld-go_) 배포 및 실행 해보기

### 배포

* 샘플 앱을 deploy 하기 위해서 "Service"가 정의된 yaml file 을 생성한다.

~~~
$ vi service.yaml
~~~

~~~
apiVersion: serving.knative.dev/v1alpha1 # Current version of Knative
kind: Service
metadata:
  name: helloworld-go # The name of the app
  namespace: default # The namespace the app will use
spec:
  template:
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go # The URL to the image of the app
          env:
            - name: TARGET # The environment variable printed out by the sample app
              value: "Go Sample v1"
~~~

~~~
$ kubectl apply -f service.yaml
~~~

### 실행 준비

* default 네임스페이스에 파드가 없는 상태 확인
* 배포 이후 파드가 조회 되지만 일정 시간 이후에는 파드가 자동으로 Terminating 된다.


~~~
$ kubectl get pod

No resources found.
~~~

* Ingressgateway URL과 라우팅시 필요한 host URL을 정의한다.

~~~
$ export HOST_URL=$(kubectl get route helloworld-go  -o jsonpath='{.status.domain}')
$ export IP_ADDRESS=$(kubectl get node -o 'jsonpath={.items[0].status.addresses[0].address}'):$(kubectl get svc istio-ingressgateway -n istio-system -o 'jsonpath={.spec.ports[?(@.port==80)].nodePort}')
~~~

### 실행 및 결과 확인

_helloworld-go_ 앱은 사용자 요청에 따라 환경변수 "TARGET" 에 정의 된 "Hello World: Go Sample v1!"라는 문자열이 클라이언트로 리턴하는 로직을 가지고 있다.

아래와 같이 사용자가 URL 로 요청하면 Header의 Host 명에 정의된 도메인으로 (_helloworld-go_ 서비스)로 요청을 라우팅하게 되고 Knative는 실행 될 파드 ("gcr.io/knative-samples/helloworld-go")가 네임스페이스에 존재하지 않을 경우 실 시간으로 해당 파드를 먼저 설치하게 된다.

이후에 또 다른 실행 요청이 없을 경우 _helloworld-go_ 파드는 삭제된다.

* 사용자 요청 수행한다.

~~~
$ curl -H "Host: ${HOST_URL}" http://${IP_ADDRESS}

Hello World: Go Sample v1!
~~~


* default 네임스페이스에 _helloworld-go_ 파드가 새로 생성되었음을 확인한다.

~~~
$ kubectl get pod

NAME                                              READY   STATUS    RESTARTS   AGE
helloworld-go-v74pk-deployment-5bdd97f8b7-977b5   3/3     Running   0          23s
~~~

* 동일한 요청을 했을 경우 설치 과정이 없으므로 이전에 비해서 빠른 응답시간을 보여준다.

~~~
$ curl -H "Host: ${HOST_URL}" http://${IP_ADDRESS}

Hello World: Go Sample v1!
~~~


* 추가 요청이 없다면 잠시 후 default 네임스페이스에 _helloworld-go_ 파드 삭제되었음을 알 수 있다.

~~~
$ kubectl get pod

No resources found.
~~~ 

### Clean-up

~~~
$ kubectl delete -f service.yaml
~~~

## Blue-Green Deployments 전략 맛보기

* Blue-Green Deployments란 무중단 배포를 위한 방안
* 현재버전을 Blue, 새버전을 Green으로 정하여 Green 으로 점점 더 많은 트래픽을 보내는 방법
* 만일 문제가 생길경우 Green 버전을 철수하여 빠르게 복구
* 응용
  * Canary Releases
  * A/B Testing

### 시나리오

1. Blue(v1) 앱을 배포해보고 URL 요청하여  `class='blue'` 코드를 포함하여 결과가 리턴 되는 지 확인한다.
1. Green(v2) 앱을 배포하고 라우팅 룰을 v1:v2 = 50:50 으로 배포하도록 정의한다.
1. URL 요청하여  `class='blue'`, `class='green'` 코드가 50:50 으로 리턴되는지 확인한다.

### 1단계 - v1 배포

* Blue (v1, route-demo-config-v1) app을 배포

~~~
$ kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1alpha1
kind: Configuration
metadata:
  name: route-demo-config-v1
  namespace: default
spec:
  revisionTemplate:
    metadata:
      labels:
        knative.dev/type: container
    spec:
      container:
        image: gcr.io/knative-samples/knative-route-demo:blue
        imagePullPolicy: Always
        env:
          - name: T_VERSION
            value: "blue"
EOF
~~~

* Route 리소스 배포

~~~
$ kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1alpha1
kind: Route
metadata:
  name: route-demo
  namespace: default
spec:
  traffic:
  - configurationName: route-demo-config-v1
    percent: 100
EOF
~~~

* kubectl 로 default 네임스페이스에 deploy 상태 확인

~~~
$ kubectl get config

NAME                   LATESTCREATED                LATESTREADY                  READY   REASON
helloworld-go          helloworld-go-v74pk          helloworld-go-v74pk          True
route-demo-config-v1   route-demo-config-v1-nvfw4   route-demo-config-v1-nvfw4   True

$ kubectl get route

NAME            URL                                        READY   REASON
helloworld-go   http://helloworld-go.default.example.com   True
route-demo      http://route-demo.default.example.com      True

~~~

* 라우팅을 위한 HOST_URL과 Ingressgateway 주소인 IP_ADDRESS 변수를 정의

~~~
$ export HOST_URL=$(kubectl get route route-demo  -o jsonpath='{.status.domain}')

$ export IP_ADDRESS=$(kubectl get node -o 'jsonpath={.items[0].status.addresses[0].address}'):$(kubectl get svc istio-ingressgateway -n istio-system -o 'jsonpath={.spec.ports[?(@.port==80)].nodePort}')
~~~

$ 2초마다 10번의 트래픽 생성하여 결과 HTML 에서 `class='blue'` 로 지정되는것을 확인한다.

~~~
$ for i in {1..10}; do curl -i -H "Host: ${HOST_URL}" http://${IP_ADDRESS}; sleep 2; done
~~~

### 2단계 - v2 배포 하고 `v1:v2=50:50` 으로 라우팅 정의


* Green (v2, route-demo-config-v2) app을 배포

~~~
$ kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1alpha1
kind: Configuration
metadata:
  name: route-demo-config-v2
  namespace: default
spec:
  revisionTemplate:
    metadata:
      labels:
        knative.dev/type: container
    spec:
      container:
        image: gcr.io/knative-samples/knative-route-demo:green # URL to the new version of the sample app docker image
        imagePullPolicy: Always
        env:
          - name: T_VERSION
            value: "green" # Updated value for the T_VERSION environment variable
EOF
~~~

* kubectl 로 default 네임스페이스에 deploy 상태 확인

~~~
$ kubectl get config

NAME                   LATESTCREATED                LATESTREADY                  READY   REASON
helloworld-go          helloworld-go-4nht8          helloworld-go-4nht8          True
route-demo-config-v1   route-demo-config-v1-ckb5s   route-demo-config-v1-ckb5s   True
route-demo-config-v2   route-demo-config-v2-98lln   route-demo-config-v2-98lln   True
~~~


* _route-demo_  Route를  v1, v2 를 50 : 50 으로 라우팅 하도록 수정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1alpha1
kind: Route
metadata:
  name: route-demo
  namespace: default
spec:
  traffic:
  - configurationName: route-demo-config-v1
    percent: 50
  - configurationName: route-demo-config-v2
    percent: 50
    name: v2
EOF
~~~

$ 2초마다 10번의 트래픽 생성하여 결과 HTML 에서 `class='blue'`, `class='green'` 로 50:50으로 보여지는 것을 확인

~~~
$ for i in {1..10}; do curl -i -H "Host: ${HOST_URL}" http://${IP_ADDRESS}; sleep 2; done
~~~

### Clean-up

~~~
$ kubectl delete config route-demo-config-v1 route-demo-config-v2
$ kubectl delete route route-demo
~~~

## 마치면서

아래와 같은 사항을 확인하였다.

* Knative는 Kubernetes, Istio 기반의 Serverless 오픈소스 플랫폼이다. Istio 대신 Gloo를 활용할 경우 기능을 제한된다.
* 사용자의 요청에 따라서 실시간으로 Running 되어야할 POD가 Create 되고 작업 완료 후 Terminating 된다.
* Knative의 Serving 컴포넌트의 Configuration, Route CRDs 를 통해 Knative Blue/Green Deployment 전략을 손쉽게 실현할 수 있다.


## 참고
* [Install Knative](https://knative.dev/docs/install/)
* [Install on Minikube](https://knative.dev/docs/install/knative-with-minikube/)
* [Getting started Knative Applicatin](https://knative.dev/docs/install/getting-started-knative-app/)
* [Knative Routing Demo](https://github.com/mchmarny/knative-route-demo)


