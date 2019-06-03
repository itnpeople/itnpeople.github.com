---
title:  "[Knative] minikube에 Knative 설치해보고 처음으로 앱 배포해보기"
date:   2019/06/03 13:35
categories: "cloud"
tags: ["recent"]
keywords: ["Knative","kubernetes","istio","install","쿠버네티스","이스티오","minikube","serverless"]
description: "Knativ는 AWS의 람다(Lambda)나, Google의 펑션(Function) 같은 Serverless 서비스를 할 수 있도록 워크로드를 구축 및 관리하는 Kubernetes 기반 오픈소스 플랫폼이다. Knative 의 기본 개념을 파악을 위해서 minikuke를 활용해 로컬에 설치해보고 샘플 앱을 배포해보고자 한다."
---

# Knative - minikube에 Knative 설치해보고 처음으로 앱 배포해보기
---
*knative 0.6.*, *docker engine 18.06.2-ce*, *kubernetes 1.12.0*, *Istio 1.0.7*, *minikube v1.0.0* , *macOS Mojave 10.14.4(18E226)*

Knativ는 AWS의 람다(Lambda)나, Google의 펑션(Function) 같은 Serverless 서비스를 할 수 있도록 워크로드를 구축 및 관리하는 Kubernetes 기반 오픈소스 플랫폼이다. Knative 의 기본 개념을 파악을 위해서 minikuke를 활용해 로컬에 설치해보고 샘플 앱을 배포해보고자 한다.

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
  * Event 컴포넌트 제외
  * VirtualBox 대신 hyperkit 드라이버를 지정 (공식문서)
  * K8s v1.12.0 로 다운그레이드 (공식문서)

* 그럼에도 불구하고 zipkin 파드가 Insufficient memory 되어 Pending 상태가 되었다 monitoring 컴포넌트도 설치 시 제외하려고 했지만 시간 관계상 다음 테스트를 진행하였다.


### 클러스터 생성

* hyperkit 드라이버 설치

~~~
brew install hyperkit

curl -LO https://storage.googleapis.com/minikube/releases/latest/docker-machine-driver-hyperkit \
&& sudo install -o root -g wheel -m 4755 docker-machine-driver-hyperkit /usr/local/bin/
~~~

* minikube 클러스터 생성

~~~
minikube start --memory=10240 --cpus=8 --disk-size=30g -p knative \
  --kubernetes-version=v1.12.0 \
  --vm-driver=hyperkit \
  --extra-config=apiserver.enable-admission-plugins="LimitRanger,NamespaceExists,NamespaceLifecycle,ResourceQuota,ServiceAccount,DefaultStorageClass,MutatingAdmissionWebhook"
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
-f https://github.com/knative/serving/releases/download/v0.6.0/monitoring.yaml \
-f https://raw.githubusercontent.com/knative/serving/v0.6.0/third_party/config/build/clusterrole.yaml
~~~

* Knative 설치 (Event 컴포넌트 제외)

~~~
$ kubectl apply --selector networking.knative.dev/certificate-provider!=cert-manager \
-f https://github.com/knative/serving/releases/download/v0.6.0/serving.yaml \
-f https://github.com/knative/build/releases/download/v0.5.0/build.yaml \
-f https://github.com/knative/serving/releases/download/v0.6.0/monitoring.yaml \
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

~~~
$ kubectl get pod

No resources found.
~~~

* 서비스 헤더에 넣어 줄 host URL과 서비스 URL을 정의한다.

~~~
$ export HOST_URL=$(kubectl get route helloworld-go  -o jsonpath='{.status.domain}')
$ export IP_ADDRESS=$(kubectl get node -o 'jsonpath={.items[0].status.addresses[0].address}'):$(kubectl get svc istio-ingressgateway -n istio-system -o 'jsonpath={.spec.ports[?(@.port==80)].nodePort}')
~~~

### 실행 및 결과 확인

_helloworld-go_ 앱은 사용자 요청에 따라 환경변수 "TARGET" 에 정의 된 "Hello World: Go Sample v1!"라는 문자열이 클라이언트로 리턴하는 로직을 가지고 있다.

아래와 같이 사용자가 _helloworld-go_로 서비스를 요청하면 Knative는 실행 될 파드 ("gcr.io/knative-samples/helloworld-go")가 네임스페이스에 존재하지 않을 경우 실 시간으로 해당 파드를 먼저 설치하게 된다.

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


## 참고
* [Install Knative](https://knative.dev/docs/install/)
* [Install on Minikube](https://knative.dev/docs/install/knative-with-minikube/)
* [Getting started Knative Applicatin](https://knative.dev/docs/install/getting-started-knative-app/)
