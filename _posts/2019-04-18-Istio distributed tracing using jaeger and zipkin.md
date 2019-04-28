
title:  "[Istio/task] Distributed tracing using Jaeger and Zipkin"
date:   2019/04/18 18:20
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","install","쿠버네티스","이스티오","minikube","jaeger","zipkin"]
description: "Service Mesh 환경은 모놀리틱한 아키텍쳐 환경과는 달리 수 많은 Microservice 간 복잡한 호출 관계를 가지고 있습니다. Istion에 포함되어 있는 jaeger, zipkin는 이러한 복잡하고 분산되어 있는 Microservice 간 논리적인  tracing 을 샘플링하여 그 결과를 시각화해 보여줍니다."
---

# Istio distributed tracing using Jaeger and Zipkin
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

*  Istio 설치한다.

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
$ kubectl get pod
~~~


* [minikube tunnel](https://github.com/kubernetes/minikube/blob/master/docs/tunnel.md) 구성

~~~
$ minikube tunnel  -p istio-trace
$ sudo route -n add 10.0.0.0/8 $(minikube ip -p istio-trace)
~~~


## Jaeger
***

* Istio 를 재구성한다.
  * `pilot.traceSampling`, `tracing.enabled` 옵션을 지정하여 tracing 과 샘플링 비율을 지정하여 Istio 재 구성한다. 
  * `pilot.traceSampling`은  trace 샘플링 비율로  0~100까지 0.01 단위로 지정할 수 있으며 기본값은 0.01이다.  연습을 위해 일단 100으로 지정한다.

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set tracing.enabled=true \
--set pilot.traceSampling=100 \
| kubectl apply -f -
~~~

* /productpage에 트래픽을 발생시킨다.

~~~
$ curl -I http://$(kubectl get svc/productpage -o jsonpath={.spec.clusterIP}):9080/productpage
~~~

* Jaeger-query URL은 다음과 같다.
~~~
$ export JAEGER_URL=http://$(kubectl get svc/jaeger-query -n istio-system -o jsonpath={.spec.clusterIP}):16686
$ echo $JAEGER_URL
~~~

* 브라우저에서 `JAEGER_URL`을 연다.
  * 좌측 조회 조건을 입력/선택하고 "Find Traces" 버튼을 클릭하여 traceing 확인한다.
  * 조회된 traceing 을 클릭하여 세부 trace 를 확인한다.



## Zipkin
***

*  앞서 지정햔 옵션에 아래와 같이 옵션을 추가하여 Istio 를 재구성한다.
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

* zipkin는 _istio-ingress-gateway_ 통해 tracing 하므로???? Bookinfo 어플에 GateWay 와 VirtualService 적용해준다.

~~~
$ kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
~~~

* /productpage에 트래픽을 발생시킨다.
  * _istio-ingress-gateway_ 서비스를 NodePort 정의 했기 때문에 아래와 같이 INGRESS_HOST, INGRESS_PORT 를 구할 수 있다.

~~~
INGRESS_HOST=$(minikube ip -p istio-trace); \
INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}'); \
curl -I http://$INGRESS_HOST:$INGRESS_PORT/productpage
~~~


* Zipkin URL 은 다음과 같다.

~~~
$ export ZIPKIN_URL=http://$(kubectl get svc/zipkin -n istio-system -o jsonpath={.spec.clusterIP}):9411
$ echo $ZIPKIN_URL
~~~

* 브라우저에서 `ZIPKIN_URL`을 연다.
 * Find Traces 버튼을 클릭하여 tracing 이 조회되는지 확인한다.



