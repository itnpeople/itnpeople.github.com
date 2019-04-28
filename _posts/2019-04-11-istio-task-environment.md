---
title:  "[Istio/task] Istio 연습과제 수행을 위한 minikube 환경 구성"
date:   2019/04/11 10:00
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","install","쿠버네티스","이스티오","minikube"]
description: "minikube 에서 Istio 공식 TASK 문서를 토대로 minikube 환경에서 연습과제를 실행해 보기 위한 사전 준비 작업을 공유합니다."
---

# Istio 연습과제 수행을 위한 minikube 환경 구성
---
*docker engine 18.06.2-ce*, *kubernetes 1.13.4*, *Istio 1.1.1* , *minikube v0.35.0*, *macOS Mojave 10.14.4(18E226)*

minikube 에서 Istio 공식 TASK 문서를 토대로 minikube 환경에서 연습과제를 실행해 보기 위한 사전 준비 작업을 공유합니다.

* [Istio 공식 TASK 문서](https://istio.io/docs/tasks//) 를 토대로 minikube 환경에서 연습과제를 실행해 보기 위한 사전 준비 문서
 

## 클러스터 준비
***

* 연습 클러스터로 minikube 사용 

* minikube 인스턴스 생성 시 리소스를 6cpu, 8G 로 지정한다.

~~~
$ minikube delete
$ minikube start --cpus 6 --memory 8192
$ minikube ssh
~~~


* Helm 설치 및 초기화

~~~
$ brew install kubernetes-helm
$ helm init
~~~

## istio 설치
***

* 몇가지 설치 방법 중 helm 으로 설치 (https://istio.io/docs/setup/kubernetes/install/helm/)
* Istio의 ingressgateway는 기본적으로  LoadBalancer 로 설치된다. 이때 minikube에 설치 처럼 LoadBalancer 를 활용할 수 없는 환경에서는 LoadBalancer 대신 NodePort 를 사용하도록 한다. (optional)

~~~
$ wget https://github.com/istio/istio/releases/download/1.1.1/istio-1.1.1-osx.tar.gz
$ tar -vxzf istio-1.1.1-osx.tar.gz
$ cd istio-1.1.1
$ cp bin/istioctl /usr/local/bin/
$ kubectl create namespace istio-system
$ helm template install/kubernetes/helm/istio-init --name istio-init --namespace istio-system | kubectl apply -f -
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~

## Bookinfo 샘플 서비스 설치
***
BookInfo는 연습시 사용되는 주요 샘플 서비스이다.

![Bookinfo Examples Apps](https://istio.io/docs/examples/bookinfo/noistio.svg)


* 설치 적용 (자동 사이드카 inject되도록 레이블링)

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/platform/kube/bookinfo.yaml)
~~~


* 파드가 올라오는지 확인

~~~
$ kubectl get pod
~~~

* 기본 Gateway, VirtualService, DestinationRule 지정

~~~
$ kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
$ kubectl apply -f samples/bookinfo/networking/destination-rule-all.yaml
~~~


* /productpage 요청했을 경우 정상(200)리턴 여부 확인

~~~
$ curl -I http://$(minikube ip -p istio-security):$(k get svc/istio-ingressgateway -n istio-system -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')/productpage
~~~

## minikube tunnel

* minikube는 Cluster IP로 접근 가능 하도록 터널링 기능을 제공한다.
* [minikube tunnel](https://github.com/kubernetes/minikube/blob/master/docs/tunnel.md)

* 터널링 설정

~~~
$ minikube tunnel
$ sudo route -n add 10.0.0.0/8 $(minikube ip)
~~~

* 터널링 상태에서는 /productpage 를 아래와 같이 바로 ClientIP 바로 접근가능한다.

~~~
$ curl -I http://$(kubectl get svc productpage -o jsonpath='{.spec.clusterIP}'):9080/productpage
~~~


* Cleanup
  * 터널링 사용 후는 반드시 cleanup 해주도록 한다.
  * 터널링 설정한 채로 minikube를 일정 시간이상  사용할 경우 `VBoxHeadless` 프로세스가 CPU가 할당된 한도에서 full로 사용하고 minikube 가 Hang 걸리는 현상 발생
  * 이와 같이 minikube 가 Hang 걸리는 현상이 발생하면  아래 cleanup 작업을 수행해주고 잠시 가디라면 정상으로 돌아온다.

~~~
$ sudo route -n delete 10.0.0.0/8
$ minikube tunnel --cleanup
~~~

