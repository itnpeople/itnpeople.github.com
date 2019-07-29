---
title:  "Istio 연습과제 - Distributed Tracing with Jaeger and Zipkin"
date:   2019/04/18 18:20
categories: "cloud"
tags: []
keywords: ["istio","kubernetes","install","쿠버네티스","이스티오","minikube","jaeger","zipkin"]
description: "Service Mesh 환경은 모놀리틱한 아키텍쳐 환경과는 달리 수 많은 Microservice 간 복잡한 호출 관계를 가지고 있습니다. Istion에 포함되어 있는 jaeger, zipkin는 이러한 복잡하고 분산되어 있는 Microservice 간 논리적인  tracing 을 샘플링하여 그 결과를 시각화해 보여줍니다."
---

# Istio 연습과제 - Distributed Tracing with Jaeger and Zipkin
---
*docker engine 18.06.2-ce*, *kubernetes 1.14.0*, *Istio 1.1.1*, *minikube v1.0.0* , *macOS Mojave 10.14.4(18E226)*

Service Mesh 환경은 모놀리틱한 아키텍쳐 환경과는 달리 수 많은 Microservice 간 복잡한 호출 관계를 가지고 있습니다. Istion에 포함되어 있는 jaeger, zipkin는 이러한 복잡하고 분산되어 있는 Microservice 간 논리적인  tracing 을 샘플링하여 그 결과를 시각화해 보여줍니다.

## 준비 작업
***

* minikube 준비

~~~
$ minikube start --cpus 4 --memory 8192 -p istio-trace
~~~

* Helm 설치 및 초기화

~~~
$ brew install kubernetes-helm
$ helm init
~~~

* Istio 초기화 (namespace, CRDs)

~~~
$ wget https://github.com/istio/istio/releases/download/1.1.1/istio-1.1.1-osx.tar.gz
$ tar -vxzf istio-1.1.1-osx.tar.gz
$ cd istio-1.1.1
$ kubectl create namespace istio-system
$ helm template install/kubernetes/helm/istio-init --name istio-init --namespace istio-system | kubectl apply -f -
~~~

*  Istio 설치

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system | kubectl apply -f -
~~~

* Istio 파드 정상상태 확인 및 대기

~~~
$ kubectl get pod -n istio-system
~~~

* Istio-system 파드 정상상태로 설치되었다면  [BookInfo](https://istio.io/docs/examples/bookinfo/) 어플 설치 및 확인

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/platform/kube/bookinfo.yaml)
$ kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
$ kubectl apply -f samples/bookinfo/networking/destination-rule-all.yaml
$ kubectl get pod
~~~

* _Istio ingress gateway_  환경변수 `GW_URL` 정의

~~~
$ export GW_URL=http://$(minikube ip -p istio-trace):$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
~~~


## Jaeger
***

* Istio 를 재구성한다.
  * `pilot.traceSampling`, `tracing.enabled` 옵션을 지정하여 tracing 과 샘플링 비율을 지정하여 Istio 재 구성
  * `pilot.traceSampling`은  trace 샘플링 비율로  0~100까지 0.01 단위로 지정할 수 있으며 기본값은 0.01이다.  연습을 위해 일단 100으로 지정

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set tracing.enabled=true \
--set pilot.traceSampling=100 \
| kubectl apply -f -
~~~

* /productpage에 트래픽을 발생시킨다.

~~~
$ curl -I $GW_URL/productpage
~~~

* Jaeger 포트포워딩
~~~
$ kubectl -n istio-system port-forward $(kubectl -n istio-system get pod -l app=jaeger -o jsonpath='{.items[0].metadata.name}') 16686:16686
~~~

* 결과확인
  * 브라우저에서 [_http://localhost:16686_](http://localhost:16686) 을 오픈
  * 좌측 조회 조건을 입력/선택하고 "Find Traces" 버튼을 클릭하여 traceing 확인
  * 조회된 traceing 을 클릭하여 세부 trace 를 확인


## Zipkin
***

*  앞서 지정햔 옵션에 아래와 같이 옵션을 추가하여 Istio 를 재구성
  * `gateways.istio-ingressgateway.type=NodePort` NodePort 로 지정
  * `tracing.provider=zipkin` zipkin 옵션
  * `tracing.ingress.enabled=true`

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set tracing.enabled=true \
--set pilot.traceSampling=100 \
--set gateways.istio-ingressgateway.type=NodePort \
--set tracing.ingress.enabled=true \
--set tracing.provider=zipkin \
| kubectl apply -f -
~~~

* zipkin 파드가 설치될 때까지 대기한다.

~~~
$ kubectl get pod -n istio-system
~~~

* /productpage에 트래픽을 발생시킨다.

~~~
$ curl -I $GW_URL/productpage
~~~

* Zipkin 포트포워딩

~~~
$ kubectl -n istio-system port-forward $(kubectl -n istio-system get pod -l app=zipkin -o jsonpath='{.items[0].metadata.name}') 9411:9411
~~~


* 결과 확인
  * 브라우저에서 [_http://localhost:9411_](http://localhost:9411) 을 오픈
  * Find Traces 버튼을 클릭하여 tracing 이 조회되는지 확인합니다.
