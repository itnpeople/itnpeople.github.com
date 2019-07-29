---
title:  "간단한 예제로 보는 Istio VirtualService와 Destination 을 활용한 Istio Traffic Routing의 이해"
date:   2019/07/24 10:01
categories: "cloud"
tags: ["recent"]
keywords: ["istio","kubernetes","쿠버네티스", "virtualservice", "destinationrule", "routing"]
description: "Istio 의 VirtualService는  Kubernetes service 를 세분화한 추상화된 Custom Resource Definition이며, 다양한 조건 정의를 통해 사용자에게 소스 또는 어플리케이션 설정정보 변경없이 선언적으로 트래픽이 라우트 되도록 해준다. Traffic Management 는 소스코드의 변경없이 트래픽의 경로를 경로를 변경 관리할 수 있는 기능으로 수많은 마이크로서비스과 그들간의 트래픽이 오고가는 서비스메시에서 기본이 되는 주요한 기능이라 할 수 있을 것입니다. 이 포스트는 이렇게 Istio 에서도 주요 feature 중 하나인 Traffic Management 의 핵심인 VirtualService 와 DestinationRule 동작 원리를 간단한 예제를 활용해서 룰셋을 적용해보고 Kubernetes의 _service_ 와 비교를 통해 Istio 라우팅의 기본 개념을 이해하는데 목적이 있습니다."
---

# 간단한 예제로 보는 Istio VirtualService와 Destination 을 활용한 Istio Traffic Routing의 이해

**kubernetes (minikube) 1.14.0*, *Istio 1.2.2*


## 시작하기

Traffic Management 는 소스코드의 변경없이 트래픽의 경로를 경로를 변경 관리할 수 있는 기능으로 수많은 마이크로서비스과 그들간의 트래픽이 오고가는 서비스메시에서 기본이 되는 주요한 기능이라 할 수 있을 것입니다.
이 포스트는 이렇게 Istio 에서도 주요 feature 중 하나인 Traffic Management 의 핵심인 VirtualService 와 DestinationRule 동작 원리를 간단한 예제를 활용해서 룰셋을 적용해보고 Kubernetes의 _service_ 와 비교를 통해 Istio 라우팅의 기본 개념을 이해하는데 목적이 있습니다.


## 예제 실행
---

### 준비작업
> 테스트 용 `hello-server-v1`, `hello-server-v2` _pod_ 2개,   _pod_  `httpbin`, `app=hello` _service_ 준비

* 클러스터에 Istio가 설치 전제
* _pod_ 3개, _service_ 1개 생성

~~~
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: hello-server-v1
  labels:
    app: hello
    version: v1
spec:
  containers:
  - image: docker.io/honester/hello-server:v1
    imagePullPolicy: IfNotPresent
    name: hello-server-v1
---
apiVersion: v1
kind: Pod
metadata:
  name: hello-server-v2
  labels:
    app: hello
    version: v2
spec:
  containers:
  - image: docker.io/honester/hello-server:v2
    imagePullPolicy: IfNotPresent
    name: hello-server-v2
---
apiVersion: v1
kind: Pod
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  containers:
  - image: docker.io/honester/httpbin:latest
    imagePullPolicy: IfNotPresent
    name: httpbin
EOF
~~~

* 생성 확인

~~~
$ kubectl get all -l app=hello

NAME                  READY   STATUS    RESTARTS   AGE
pod/hello-server-v1   2/2     Running   0          20m
pod/hello-server-v2   2/2     Running   0          20m
~~~


### Cases
> 다음은 개념 파악을 위한 5개 샘플 Case 입니다.
> Case 1,2 는 Kubernetes 의  _service_ 를 통해 _workload_ 를 서비스하는 경우이며 Case3,4는 **VirtualService** 를 통해 라우팅 룰셋 적용 case 입니다.

* Case 1
  * Kuberntes _service_ 가 바라보는 _endpoints_ 가 다수인 경우 
  * `hello-server-v1`, `hello-server-v2`는 결과 확인을 위해 2종류의 _pod_ 로 구성하였으나 하나의 _workload_ 로 가정합니다.
  * 트래픽은 _endpoints_ 들로 round robin 되어 전달됩니다.
* Case 2
  * Kuberntes 서비스 구성
  * 트래픽은 각각 지정하는 _service_ 로 전달됩니다.
* Case 3
  * Istio VirtualService 에 uri에 따른 라우팅 룰셋 정의하는 경우
  * 트래픽은 기본적으로 v1 _pod_ 로 전달되나 URI prefix 가 **/v2** 인 경우는 v2 _pod_로 라우팅 됩니다.
* Case 4
  * Istio VirtualService 을 이용하여 라우팅 비율 룰셋을 지정하는 경우
  * 트래픽  은 v1 _pod_ 와 v2 _pod_ 각각 9:1 비율로 전달됩니다.

![Cases](/resources/img/post/istio-virtualservice-case.png)

* Case 5
  * v1, v2 _service_ 대신 **DestinationRule** 을 이용는 경우
  * Case 4와 동일한 결과를 리턴 받습니다.
  * VirtualService 에서 `app=hello` 로 _endpoints_ 를 지정하고 DestinationRule 에서 label `version=v1`, `version=v2` 지정해 subset으로 세분화 구성
  * 트래픽  은 v1 _pod_ 와 v2 _pod_ 각각 9:1 비율로 전달됩니다.

![Cases](/resources/img/post/istio-virtualservice-case-2.png)


###  Case 1
> 2개의 샘플 _pod_ - `hello-server-v1`, `hello-server-v2` - 가 서로 같은 App. 이라 정의하고 (실제로는 다르지만) 
> `svc-hello` 로 트래픽을  발생시키면 해당 트래픽은 endpoints 로 round robin 되는것을 확인합니다.

* `svc-hello` service 생성

~~~
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: svc-hello
  labels:
    app: hello
spec:
  selector:
    app: hello
  ports:
  - name: http
    protocol: TCP
    port: 8080
EOF
~~~


* endpoint 확인
  * `svc-hello` 추가 생성

~~~
$ kubectl get endpoints -l app=hello

NAME           ENDPOINTS                         AGE
svc-hello      172.17.0.5:8080,172.17.0.6:8080   92m
svc-hello-v1   172.17.0.5:8080                   2m6s
svc-hello-v2   172.17.0.6:8080                   14s
~~~

* `svc-hello` 에 트래픽을 전달하여 결과 확인해 봅니다.
  * `hello-server-v1` , `hello-server-v2` 각각으로 Round Robin

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v2
Hello server - v1
Hello server - v2
Hello server - v1
Hello server - v1
~~~

### Case 2
> _pod_ `hello-server-v1`, `hello-server-v2` 를 각각 서비스 `svc-hello-v1`, `svc-hello-v2`로 match 시키고  각 _service_ 로 트래픽을 발생시키면 각각의 _pod_ 로 전달되는 것을 확인합니다.

* `svc-hello-v1`, `svc-hello-v2` 생성

~~~
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: svc-hello-v1
  labels:
    app: hello
spec:
  selector:
    app: hello
    version: v1
  ports:
  - name: http
    protocol: TCP
    port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: svc-hello-v2
  labels:
    app: hello
spec:
  selector:
    app: hello
    version: v2
  ports:
  - name: http
    protocol: TCP
    port: 8080
EOF
~~~

* endpoint 확인

~~~
$ kubectl get endpoints -l app=hello

NAME        ENDPOINTS                         AGE
svc-hello-v1   172.17.0.5:8080                   2m6s
svc-hello-v2   172.17.0.6:8080                   14s
~~~

* `svc-hello-v1`, `svc-hello-v2` 에 트래픽을 전달하여 결과 확인하기

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello-v1.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1

$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello-v2.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v2
Hello server - v2
Hello server - v2
Hello server - v2
Hello server - v2
~~~


### Case 3
> 이전 round robin 되엇던 `svc-hello` _service_ 에 **VirtualService** CRDs 를 사용하여 라우트 룰셋을 정의하여 줍니다.
> 룰셋은 기본적으로 `svc-hello-v1` 로 라우트 되지만 URI prefix가 `\v2` 이면 `svc-hello-v2`로 라우트 되도록합니다..

* VirtualService 생성
  * 기본적으로 `svc-hello-v1` 로 라우트되고 URI prefix가 `\v2` 이면 `svc-hello-v2`로 라우트되는 룰셋
  * spec.hosts 는 대상 _service_
  * spec.http.route.destination 는 기본 라우트 _service_
  * spec.http.match.* 에 라우트 조건 지정 
  * spec.*.destination.host 는 destination _service_

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vs-hello
spec:
  hosts:
  - "svc-hello.default.svc.cluster.local"
  http:
  - match:
    - uri:
        prefix: /v2
    route:
    - destination:
        host: "svc-hello-v2.default.svc.cluster.local"
  - route:
    - destination:
        host: "svc-hello-v1.default.svc.cluster.local"
EOF
~~~

* endpoint 확인
  * 변경사항은 없고 이전과 동일합니다.

~~~
$ kubectl get endpoints -l app=hello

NAME           ENDPOINTS                         AGE
svc-hello      172.17.0.5:8080,172.17.0.6:8080   101m
svc-hello-v1   172.17.0.5:8080                   11m
svc-hello-v2   172.17.0.6:8080                   9m13s
~~~

* `svc-hello` 로 트래픽을 발생시키면  `svc-hello-v1` 으로 라우트됩니다.

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
~~~

*  prefix `\v2` 로 트래픽을 발생하면  `svc-hello-v2` 으로 라우트됩니다.

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080/v2; sleep 0.5; done

Hello server - v2 (uri=/v2)
Hello server - v2 (uri=/v2)
Hello server - v2 (uri=/v2)
Hello server - v2 (uri=/v2)
Hello server - v2 (uri=/v2)
~~~

### Case 4
> **VirtualService** 는 Destination weight 스펙을 통해 라우트되는 비율을 정의할 수 있습니다.

* VirtualService 를 수정 적용
  * v1:v2 = 90:10 비율로 라우트 되도록 합니다.
  * spec.*.route.*.destination.weight 에 라우트 비율 정의 (%)

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vs-hello
spec:
  hosts:
  - "svc-hello.default.svc.cluster.local"
  http:
  - route:
    - destination:
        host: "svc-hello-v1.default.svc.cluster.local"
      weight: 90
    - destination:
        host: "svc-hello-v2.default.svc.cluster.local"
      weight: 10
EOF
~~~

* 트래픽을 전달하여 결과를 확인합니다.

~~~
$ for i in {1..20}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
...
Hello server - v2
....
Hello server - v1
~~~

###  Case 5
> Case 4 와 같이 각 _pod_ 별 _service_ 를 구성하는 대신 **DestinationRule** 을 이용하여 동일한 결과 구현합니다.

* DestinationRule 생성하여 subset 을 구성하고 VirtualService 에서 이를 지정합니다.
  * _service_ 는 label `app=hello` 로 타켓 _endpoints_ 정의
  * DestinationRule 에서 label `version=v1`, `version=v2` 으로 subset `v1`, `v2` 을 구성

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: dr-hello
spec:
  host: svc-hello.default.svc.cluster.local
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vs-hello
spec:
  hosts:
  - "svc-hello.default.svc.cluster.local"
  http:
  - route:
    - destination:
        host: "svc-hello.default.svc.cluster.local"
        subset: v1
      weight: 90
    - destination:
        host: "svc-hello.default.svc.cluster.local"
        subset: v2
      weight: 10
EOF
~~~

* 트래픽을 전달하여 결과를 확인합니다.

~~~
$ for i in {1..10}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
...
Hello server - v2
....
Hello server - v1
~~~



### Clean-up

~~~
$ kubectl delete pod/httpbin pod/hello-server-v1 pod/hello-server-v2 service/svc-hello service/svc-hello-v1 service/svc-hello-v2 vs/vs-hello dr/dr-hello
~~~


## VirtualService
---

프로토콜(http/tls/tcp)별로 트래픽 라우트 룰셋(destination)을 정의


### 주요 Spec

* hosts

  * _service_ 이름
  * service registry 또는 ServiceEntry(external Mesh) 에서 lookup
  * short 네임은 대신 full 네임 권장 (`reviews` interpreted `reviews.default.svc.cluster.local`)
  * only `*` 설정 불가하지만 `*.default.svc.cluster.local`, `*.svc.cluster.local` 가능
  * 라우팅할 destination 이 없으면 무시(drop)됨


* spec.[http/tls/tcp].match

  * 라우팅 조건을 정의합니다.
  * exact, prefix, regex
  * 정의 가능 조건 : uri, method, headers, port, source Labels, gateways, queryParams

* spec.[http/tls/tcp].route

  * default 트래픽 라우팅 룰셋을 정의

* spec.[http/tls/tcp]...route.destination

  * (필수) 요청/연결을 포워딩해야 하는 _service_ 인스턴스 고유한 식별자

* spec.[http/tls/tcp].*.destination.host

  * 타켓 _service_ 인스턴스

* spec.[http/tls/tcp].*.destination.subset

  * **DestinationRule**의 subset

* spec.gateways

  * 라우트 해야하는 gateway, sidecar 이름

* spec.exportTo

  * 현재 virtual service 를 export 하는 네임스페이스를 정의

## DestinationRule
---

라우팅 발생 이후 트래픽 관련된 정책을 정의하는 Custom Resource Definition

* 트래픽 정책
  * Load-balancing
  * connection-pool
  * pool 에서 unhealthy 한 서비스 detect & 제거

* subset
  * 버전 특정 정책들 정의하고 service 레벨의 특정 설정을 overriding 합니다.


## Conclusion
---

Istio 의 **VirtualService** 는  Kubernetes _service_ 를 세분화한 추상화된 Custom Resource Definition이며, 다양한 조건 정의를 통해 사용자에게 소스 또는 어플리케이션 설정정보 변경없이 선언적으로 트래픽이 라우팅 되도록합니다.
