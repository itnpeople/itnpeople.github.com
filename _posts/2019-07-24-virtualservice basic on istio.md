---
title:  "[Istio] VirtualService 간단한 적용 예제를 통한 Istio Traffic Routing의 이해"
date:   2019/07/24 10:01
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","쿠버네티스", "virtualservice"]
description: "Istio 의 VirtualService는  Kubernetes service 를 세분화한 추상화된 Custom Resource Definition이며, 다양한 조건 정의를 통해 사용자에게 소스 또는 어플리케이션 설정정보 변경없이 선언적으로 Traffic이 라우트 되도록 해준다. 이에 간단한  Kubernetes의 service 와 Istio 가 제공하고 있는 VirtualService를 활용한 라우트 룰셋 적용 결과 비교를 통해 VirtualService 의 기본 개념을 이해해본다."
---

# Istio VirtualService 간단한 적용 예제를 통한 Istio Traffic Routing의 이해

**kubernetes (minikube) 1.14.0*, *Istio 1.2.2*

간단한  Kubernetes의 _service_ 와 Istio 가 제공하고 있는 VirtualService를 활용한 라우트 룰셋 적용 결과 비교를 통해 VirtualService 의 기본 개념을 이해해본다.


## 데모
---

### 준비작업
> 테스트 용 `hello-server-v1`, `hello-server-v2` _pod_ 2개, dummy _pod_  `curl`, `app=hello` _service_ 준비

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
  - image: honester/hello-server:v1
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
  - image: honester/hello-server:v2
    imagePullPolicy: IfNotPresent
    name: hello-server-v2
---
apiVersion: v1
kind: Pod
metadata:
  name: curl
  labels:
    app: curl
spec:
  containers:
  - image: honester/servicemesh-prototype:0.1.3
    imagePullPolicy: IfNotPresent
    name: curl
EOF
~~~

* 생성 확인

~~~
$ kubectl get all -l app=hello

NAME                  READY   STATUS    RESTARTS   AGE
pod/hello-server-v1   2/2     Running   0          20m
pod/hello-server-v2   2/2     Running   0          20m
~~~

### Case 1
> _pod_ `hello-server-v1`, `hello-server-v2` 를 각각 서비스 `svc-hello-v1`, `svc-hello-v2`로 match 시키고  각 _service_ 로 Traffic을 발생시키면 각각의 _pod_ 로 전달되는 것을 확인한다.

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

* `svc-hello-v1`, `svc-hello-v2` 에 Traffic 전달하여 결과 확인하기

~~~
$ kubectl exec -it curl bash

# for i in {1..5}; do curl http://svc-hello-v1.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)

# for i in {1..5}; do curl http://svc-hello-v2.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v2 (requestUri=/)
Hello server - v2 (requestUri=/)
Hello server - v2 (requestUri=/)
Hello server - v2 (requestUri=/)
Hello server - v2 (requestUri=/)
~~~

###  Case - 2
> 2개의 샘플 _pod_ - `hello-server-v1`, `hello-server-v2` - 가 서로 같은 App. 이라 정의하고 (실제로는 다르지만) 
> `svc-hello` 로 Traffic 발생시키면 해당 Traffic은 endpoints 로 round robin 되는것을 확인한다.

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

* `svc-hello` 에 Traffic 전달하여 결과 확인해 보기
  * `hello-server-v1` , `hello-server-v2` 각각으로 Round Robin

~~~
$ kubectl exec -it curl bash

# for i in {1..5}; do curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v2 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v2 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
~~~

### Case 3
> 이전 round robin 되엇던 `svc-hello` _service_ 에 **VirtualService** CRDs 를 사용하여 라우트 룰셋을 정의하여 준다.
> 룰셋은 기본적으로 `svc-hello-v1` 로 라우트 되지만 URI prefix가 `\v2` 이면 `svc-hello-v2`로 라우트 되도록한다.

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
  * 변경사항은 없고 이전과 동일하다.

~~~
$ kubectl get endpoints -l app=hello

NAME           ENDPOINTS                         AGE
svc-hello      172.17.0.5:8080,172.17.0.6:8080   101m
svc-hello-v1   172.17.0.5:8080                   11m
svc-hello-v2   172.17.0.6:8080                   9m13s
~~~

* `svc-hello` 로 Traffic을 발생시키면  `svc-hello-v1` 으로 라우트된다.

~~~
$ kubectl exec -it curl bash

# for i in {1..5}; do curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
~~~

*  prefix `\v2` 로 Traffic을 발생하면  `svc-hello-v2` 으로 라우트된다.

~~~
# for i in {1..5}; do curl http://svc-hello.default.svc.cluster.local:8080/v2; sleep 0.5; done

Hello server - v2 (requestUri=/v2)
Hello server - v2 (requestUri=/v2)
Hello server - v2 (requestUri=/v2)
Hello server - v2 (requestUri=/v2)
Hello server - v2 (requestUri=/v2)
~~~

### Case 4
> **VirtualService** 는 Destination weight 스펙을 통해 라우트되는 비율을 정의할 수 있다.

* VirtualService 를 수정 적용
  * v1:v2 = 90:10 비율로 라우트 되도록 한다.
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

~~~
# for i in {1..20}; do curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.5; done

Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
Hello server - v1 (requestUri=/)
...
Hello server - v2 (requestUri=/)
....
Hello server - v1 (requestUri=/)
~~~

### Clean-up

~~~
$ kubectl delete pod/curl pod/hello-server-v1 pod/hello-server-v2 service/svc-hello service/svc-hello-v1 service/svc-hello-v2 vs/vs-hello
~~~

## VirtualService
---

프로토콜(http/tls/tcp)별로 Traffic 라우트 룰셋(destination)을 정의


### 주요 Spec

* hosts

  * _service_ 이름
  * service registry 또는 ServiceEntry(external Mesh) 에서 lookup
  * short 네임은 대신 full 네임 권장 (`reviews` interpreted `reviews.default.svc.cluster.local`)
  * only `*` 설정 불가하지만 `*.default.svc.cluster.local`, `*.svc.cluster.local` 가능
  * 라우팅할 destination 이 없으면 무시(drop)됨


* spec.[http/tls/tcp].match

  * 라우팅 조건을 정의한다.
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


## Conclusion
---

Istio 의 **VirtualService** 는  Kubernetes _service_ 를 세분화한 추상화된 Custom Resource Definition이며, 다양한 조건 정의를 통해 사용자에게 소스 또는 어플리케이션 설정정보 변경없이 선언적으로 Traffic이 라우트 되도록 해준다.
