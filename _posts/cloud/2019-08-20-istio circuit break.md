---
title:  "Istio Circuit Breaking"
date:   2019/08/20 14:35
categories: "cloud"
tags: ["cloud", "istio","kubernetes"]
keywords: ["istio","kubernetes","쿠버네티스", "circuit break", "destinationrule"]
description: "Circuit Breaking이란  전기의 회로차단기에서 차용한 개념으로 전기가 흐르다가 문제가 생기면 회로를 open하여 더이상 전기가 흐르지 않도록하여  문제가 되는 부분으로 부터 전체 시스템에 장애가 전파되지 않도록 하는데 목적이 있습니다. Istio 에서는 envoy 를 활용하여 circuit breaking 기능을 제공하고 있습니다. 이중 Istio 의 destinationrul의  connectionPool, outlierDetection 스펙을 활용한 circuit breaking 기능을 간단한 예제를 통해 검증해 봅니다."
---

# Istio Circuit Breaking
**kubernetes (minikube) 1.14.0*, *Istio 1.2.2*


## 개요
***

### _Circuit Breaking_ 이란

_Circuit Breaking_ 이란  전기의 회로차단기에서 차용한 개념입니다. 회로가 close될때는 정상적으로 전기가 흐르다가 문제가 생기면 회로를 open하여 더이상 전기가 흐르지 않도록 한 것과 같이, 평소(Close state)에는 정상적으로 동작하다가, 오류 발생시(Open state) 더이상 동작하지 않도록 합니다. 

* Circuit Breaker (회로 차단기)

![Circuit Breaker](https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Jtecul.jpg/150px-Jtecul.jpg)

### Goal

* 만일 하나의 서비스가 장애가 발생하게 되면 장애 서비스를 호출하는 서비스는 대기 상태가 되고 다시 대기 중인 서비스를 호출하는 또 다른 서비스도 대기하게 되어 장애가 차례대로 전파 됩니다.
* Circuit Breaker 의 역할은 이렇게 문제가 되는 기능 자체를 동작하지 않도록해 리소스 점유의 증가로 장애가 전파되지 않도록 하는데 목적이 있습니다.

### 유스케이스

> Istio 는 _DestinationRule_ 의 `.trafficPolicy.outlierDetection`, `.trafficPolicy.connectionPool` 스팩을 통해 _circuit breaking_ 을 정의할 수 있으며 다음과 같이 2가지 유즈케이스를 가지고 있습니다.


* **첫번째**, Connection Max & Pending 수에 따른  _circuit break_

  * _service_ 요청(upstream)에 대한 connection pool 을 정의합니다.
  * 최대 활성 연결 갯수와 최대 요청 대기 수를 지정합니다.
  * 허용된 최대 요청 수 보다 많은 요청을 하게 되면 지정된 임계값만큼 대기 요청을 갖게됩니다.
  * 이 임계점을 넘어가는 추가적인 요청은 거부(_circuit break_)하게 됩니다.
  

* **두번째**, Load balancing pool의 인스턴스의 상태에 기반하는 _circuit break_
  * 인스턴스(_endpoints_) 에 대한 load balancing pool 이 생성/운영 됩니다.
  * n개의 인스턴스를 가지는 load balancing pool 중  응답이 없는 인스턴스를 탐지하고 배제(_circuit break_)합니다.
  * HTTP 서비스인 경우 미리 정의된 시간 동안 API 호출 할 때 5xx 에러가 지속적으로 리턴되면 pool 로 부터 제외됩니다.
  * TCP 서비스인 경우 연속 오류 매트릭 측정시 connection timeout 또는 connection 실패 하게되면 오류 hosts 로 카운트됩니다.

## 유스케이스 검증
***

### **첫번째**, Connection Max & Pending 수에 따른  _circuit break_

> 지정된 서비스에 connections 의 volume을 제한하여 가능 용량 이상의 트래픽 증가에 따른 서비스 Pending 상태를 막도록 _circuit break_ 를 작동시키는 방법입니다.


* _circuit break_ 대상 대상이 되는 httpbin 앱을 설치합니다.
  * httpbin 은 HTTP 프로토콜 echo 응답 앱입니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
      - name: httpbin
        image: docker.io/honester/httpbin:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  selector:
    app: httpbin
  ports:
  - name: http
    port: 8000
    targetPort: 80
EOF
~~~

* 마이크로서비스 로드 테스트 툴인 [fortio](https:// fortio.org) 을 설치합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: fortio
  labels:
    app: fortio
spec:
  containers:
  - image: docker.io/fortio/fortio:latest_release
    imagePullPolicy: IfNotPresent
    name: fortio
    ports:
    - containerPort: 8080
      name: http-fortio
    - containerPort: 8079
      name: grpc-ping
EOF
~~~


* fortio 에서 _httpbin_ 으로 요청해봅니다. **200(정상)** 응답 코드가 리턴됩니다.

~~~
$ kubectl exec -it fortio  -c fortio /usr/bin/fortio -- load -curl  http://httpbin.default:8000/get

HTTP/1.1 200 OK
server: envoy
date: Tue, 06 Aug 2019 07:24:01 GMT
content-type: application/json
content-length: 387
access-control-allow-origin: *
access-control-allow-credentials: true
x-envoy-upstream-service-time: 5

{
  "args": {},
  "headers": {
    "Content-Length": "0",
    "Host": "httpbin.default:8000",
    "User-Agent": "fortio.org/fortio-1.3.1",
    "X-B3-Parentspanid": "da4c8e3eeabd46d6",
    "X-B3-Sampled": "0",
    "X-B3-Spanid": "c0ffb9ffebbaf2f7",
    "X-B3-Traceid": "bc75ebdbf949538fda4c8e3eeabd46d6"
  },
  "origin": "127.0.0.1",
  "url": "http://httpbin.default:8000/get"
}
~~~

* Kiali 에서는 다음과 같이 조회됩니다.

![Kiali](/resources/img/post/istio-circuit-break-01.png)


* DestinationRule 를 생성하여 _circuit break_ 가 발생할 수 있도록 Connection pool을 최소값으로 지정합니다.
  * http1MaxPendingRequests=1 : Queue에서 onnection pool 에 연결을 기다리는 request 수를 1개로 제한합니다.
  * maxRequestsPerConnection=1 : keep alive 기능 disable 합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: dr-httpbin
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 1
        maxRequestsPerConnection: 1
EOF
~~~

* Kiali 에서는 아래와 같이 circuit break 뱃지가 나타납니다.

![Kiali](/resources/img/post/istio-circuit-break-02.png)


* 비교를 위해 작은 양의 트래픽 load를  발생시킵니다. 
  * 호출 10회
  * 결과를 확인해보면 모두 응답코드 **200(정상)** 을 리턴 합니다.

~~~
$ kubectl exec -it fortio -c fortio /usr/bin/fortio -- load -c 1 -qps 0 -n 10 -loglevel Warning http://httpbin:8000/get

...
Code 200 : 10 (100.0 %)
...
~~~

* `-c 2` 옵션으로 동시 연결을 2로 늘려 트래픽 load를 발생 시킵니다.
  * 연결당 호출 10회, 총 20회
  * 결과를 확인해보면 응답코드 **503(오류)** 응답 코드가 1회 발생했습니다.


~~~
$ kubectl exec -it fortio -c fortio /usr/bin/fortio -- load -c 2 -qps 0 -n 20 -loglevel Warning http://httpbin:8000/get

...
Code 200 : 19 (95.0 %)
Code 503 : 1 (5.0 %)
...
~~~

* `-c 3` 옵션으로 동시 연결을 3로 늘려 더 많은 트래픽 load를 발생 시킵니다.
  * 연결당 호출 10회, 총 20회
  * 결과를 확인해보면 응답코드 **503(오류)** 응답 코드가 14회 발생했습니다.


~~~
$ kubectl exec -it fortio  -c fortio /usr/bin/fortio -- load -c 3 -qps 0 -n 30 -loglevel Warning http://httpbin:8000/get

...
Code 200 : 16 (53.3 %)
Code 503 : 14 (46.7 %)
...
~~~

* 아래와 같이 `dr-httpbin`를 삭제하고 _circuit break_ 를 제거한 상태에서 동일한 트래픽 load 를 발생시키면 응답코드가 모두 **200(정상)** 임을 확인할 수 있습니다.

~~~
$ kubectl delete dr/dr-httpbin
$ kubectl exec -it fortio  -c fortio /usr/bin/fortio -- load -c 3 -qps 0 -n 30 -loglevel Warning http://httpbin:8000/get

...
Code 200 : 30 (100.0 %)
...
~~~

* 이와 같이 istio 는 DestinationRule을 통해 _circuit break_ 를 정의를 할 수 있습니다.


* Clean-up

~~~
$ kubectl delete pod/fortio deployment.apps/httpbin service/httpbin
~~~


* Conclusion 

![istio circuit breaking use-case 1](/resources/img/post/istio-circuit-break-p1.png)

* _k8s service_ `svc-httpbin` 에 _DestionationRule_ `dr-httpbin` 을 정의하여 connections 의 volume 1개, ending valume 1개로 제한하였습니다.
* 1번 요청의 경우는 정상 요청처리 중입니다.
* 2번 요청이 발생 했을때 1번 요청 처리 중이라면 2번 요청은 pending 상태가 됩니다.
* 1,2번 요청이 처리,pending 상태에서 3번 요청이 발생하게 된다면 설정에 따라 _circuit break_ 가 발생하게 됩니다.



### 두번째, Load balancing pool의 인스턴스의 상태에 기반하는 _circuit break_ 

> n개의 인스턴스를 가지는 load balancing pool 중 오류 발생하거나 응답이 없는 인스턴스를 탐지하여  _circuit break_  를 작동시키는 방법입니다.


* 전제 조건
  * hello-server:latest 이미지는 env:RANDOM_ERROR 값의 확률로 랜덤하게 503 에러를 발생하는 로직이 포함되어 있습니다.
  * 데모를 위해서 hello-server-1, hello-server-2 가 동일 workload 라고 가정합니다.

* 기본 환경을 구성합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: hello-server-1
  labels:
    app: hello
spec:
  containers:
  - name: hello-server-1
    image: docker.io/honester/hello-server:latest
    imagePullPolicy: IfNotPresent
    env:
    - name: VERSION
      value: "v1"
    - name: LOG
      value: "1"
---
apiVersion: v1
kind: Pod
metadata:
  name: hello-server-2
  labels:
    app: hello
spec:
  containers:
  - name: hello-server-2
    image: docker.io/honester/hello-server:latest
    imagePullPolicy: IfNotPresent
    env:
    - name: VERSION
      value: "v2"
    - name: LOG
      value: "1"
    - name: RANDOM_ERROR
      value: "0.2"
---
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


* 클라이언트용 _pod_ 를 설치합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  containers:
  - name: httpbin
    image: docker.io/honester/httpbin:latest
    imagePullPolicy: IfNotPresent
EOF
~~~

* `httpbin` 컨테이너에서 `svc-hello` 서비스로 요청합니다.
  * v1, v2 각각 5번씩 요쳥 결과가 조회됩니다.

~~~
for i in {1..10}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default:8080; sleep 0.1; done

Hello server - v2
Hello server - v2
Hello server - v1
Hello server - v1
Hello server - v2
Hello server - v1
Hello server - v2
Hello server - v1
Hello server - v1
Hello server - v2
~~~

* 위와 같이 클라이언트 요청에 따라 에러가 리턴되지는 않았습니다 
* 하지만 실제로는 아래와 같이  `hello-server-2` _pod_ 에서 내부 로직에 따라 20% 확률로 에러를 발생했고 이에 Kubernetes가 자동으로 재 요청했음을 알 수 있습니다.
* 200(정상) 5회, 503(실패) 1회로 결국 클라이언트로 정상 전달된 5번이  실행되었음을 알 수 있습니다.

~~~
$ kubectl logs hello-server-2 -c hello-server-2

Hello server - v2 - 200
Hello server - v2 - 200
Hello server - v2 - 200
Hello server - v2 - 200
Hello server - v2 - 503 (random)
Hello server - v2 - 200
~~~

* Kiali 에서는 다음과 같이 조회됩니다.

![Kiali](/resources/img/post/istio-circuit-break-03.png)

* DestinationRule 를 생성  `outlierDetection` 스펙을 통해 _circuit break_ 를 정의합니다.
  * 매 interval(1s)마다 스캔하여
  * 연속적으로 consecutiveErrors(1) 번 5XX 에러 가 발생하면
  * baseEjectionTime(3m)동안 배제(circuit breaking) 처리됩니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: dr-hello
spec:
  host: svc-hello
  trafficPolicy:
    outlierDetection:
      interval: 1s
      consecutiveErrors: 1
      baseEjectionTime: 3m
      maxEjectionPercent: 100
EOF
~~~

* 다시 동일한 요청을 합니다.

~~~
for i in {1..10}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default:8080; sleep 0.1; done

Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
~~~

* 결과는 위와 같이 이전 결과와는 다르게 v1 결과 만을 리턴되는 것을 확인할 수 있습니다.
* `hello-server-2` 컨테이너 로그를 조회하면 공교롭게도 (20% 확률로) 이전 요청 이후 바로 다음 요청에 503 에러가 발생되었음을 알 수 있습니다.
* 그리고 그 이후로 v2 _pod_ 로 요청되지 않았음을 확인 할 수 있습니다.

~~~
$ kubectl logs hello-server-2 -c hello-server-2

Hello server - v2 - 200
Hello server - v2 - 200
Hello server - v2 - 200
Hello server - v2 - 200
Hello server - v2 - 503 (random)
Hello server - v2 - 200
Hello server - v2 - 503 (random)
~~~


* Clean-up

~~~
$ kubernetes delete pod/hello-server-1 pod/hello-server-2 pod/httpbin service/svc-hello dr/dr-hello
~~~


* Conclusion 

![istio circuit breaking use-case 2](/resources/img/post/istio-circuit-break-p2.png)

* _k8s service_ `svc-hello` 에 _DestionationRule_ `dr-hello` 을 정의하여 오류가  발생하는 인스턴스를 배제(_circuit break_)합니다.
* 1초간격(interval: 1s)으로 응답여부를 탐지하고 연속으로 1회 에러(consecutiveErrors) 가 발생하면 3분간(baseEjectionTime: 3m) _circuit break_  합니다.


## DestinationRule
***

## 주요 spec.

### .trafficPolicy
> 트래픽 정책을 정의합니다.

* Outlier detection (circuit breaking)
* Connection pool sizes
* Load balancing policy

### .trafficPolicy.outlierDetection
> Load balancing pool 에서 unhealthy hosts를 제외하는 룰를 정의합니다.

* consecutiveErrors : hosts가 connection pool 에서 제외되는 오류 수 (Default 5)
* interval : 제외 분석 간격. format: 1h/1m/1s/1ms. MUST BE >=1ms. (Default 10s)
* baseEjectionTime : _circuit break_ 시간 (Default 30s.)
* maxEjectionPercent : load balancing pool 에서 제외될 수 있는 upstream servie 비율 (Defaults to 10%.)
* minHealthPercent : Outlier detection이 활성화 되기 위한 최소 healthy hosts 비율. healthy hosts 비율이 해당 값 이상이면 Outlier detection가 활성화되지만 load balancing pool 에서 healthy hosts 비율이 임계점 밑으로 떨어진다면 Outlier detection 은 비활성화되고 모든 hosts 들을 대상으로 load balancing 됩니다. (Defaults to 50%.)

### .trafficPolicy.connectionPool
> upstream _service_ 로 가는 connections 의 volume을 정의합니다.

* .http
  * .http1MaxPendingRequests:  Queue에서 connection pool 에 연결을 기다리는 최대 request 수 HTTP/1.1 해당,  Default 1024. 
  * .http2MaxRequests : 백엔드로 가는 최대 요청 수. HTTP/2 해당, Default 1024. 
  * .maxRequestsPerConnection : connection 당 최대 요쳥 수. 값이 1 이면 keep alive 기능 disable
  * .maxRetries: 주어진 시간 동안의 최대 재시도 수.  Default 1024. 
  * .idleTimeout : connection pool connections 의 비가동 timeout
* .tcp
  * .maxConnections : 목적지로 가는 HTTP, TCP connection 최대 값.  Default 1024. 
  * .connectTimeout :  TCP Connection timeout
  * .tcpKeepalive : 설졍한 경우 SO_KEEPALIVE 을 지정하여 TCP Keepalives 활성화, Linux Kernel 설정, `time`(Default 7200s) 동안 서로 패킷 교환이 없을경우 probes 패킷을 `interval`(Default 75s) 마다 `probes`(Default 9) 번  전달하고 응답이 없는 경우 close 한다)

### .trafficPolicy.loadBalancer

> Load balancer 알고리즘을 관리합니다.

* .simple
  * ROUND_ROBIN	 : Round Robin. Default
  * LEAST_CONN	: 활성 요청이 적은 host 선택합니다.
  * RANDOM	: 무작위 host 선택, Round Robin 보다 나은 성능을 제공합니다.
  * PASSTHROUGH : 어떠한 형태의 로드 밸런싱도 하지 않고 호출자가 요청한 원래 IP 주소로 연결을 전달합니다.
* .consistentHash
  * HTTP headers의  cookies 나 다른 속성으로 load balancing 수행하는 방식


### _DestinationRule_ 예

* HTTP/2 프로토콜은 동시 요청 1000 개,  HTTP/1.1 프르토콜은 connection pool 크기는 100이며 하나의 connection 당 request 수는 10 이하 로 정의되어 있습니다.
* Detection Ruleset : 매 5 분 간격으로 스캔하고 7변 연속으로 5XX 에러가 발생하면  15 분 동안 _circuit breaking_ 합니다.

~~~
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: reviews-cb-policy
spec:
  host: reviews.prod.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutiveErrors: 7
      interval: 5m
      baseEjectionTime: 15m
~~~


## 참고
***

### Envoy Circuit Breaking

* Istio는 Envoy _circuit breaking_ 기능을 활용하고 있습니다.
* Envoy 는  다양한 형식의 _fully distributed circut breaking_ 지원합니다.

  * maximum connections
    * 모든 upstream hosts 에 establish 되는 최대 connection 수
    * HTTP/2 는 각 host 별로 single connection 을 사용하기 때문에 HTTP/1.1 만 해당
  * maximum pending requests
	* connection pool 에 연결을 기다리는 Queue 내 최대 request 수
	* HTTP/2 는 single connection 이므로 connection이 생성되고 바로 다중화는 초기 connection이 생성될 때만 Circuit Breaker 동작
	* HTTP/1.1 은 upstream connection pool 충분하지 않아 요청이 dispatch 가능할 때까지 pending 리스트에 추가되기 때문에 프로세스 lifetime 동안 계속 동작
  * maximum requests
    * 주어진 시간에 처리되고 있는 최대 request 수 
  * maximum active retries
    * 주어진 시간에 처리되고 있는 최대 재시도 request 수 
  * maximum concurrent connection pools
    * 인스턴싱되어 동시 실행 중인 최대 connection pool 수


### Keep-alive

* HTTP는 connection less방식이라 매번 socket(port)를 열어야 하고 이는 비용적인 측면에서 비효율적인 구조입니다.
* Keep Alive란 연결된 socket에 IN/OUT의 access가 마지막으로 종료된 시점부터 정의된 시간까지 access가 없더라도 대기하도록 하여 정의된 시간내에 access가 이루어진다면 계속 연결된 상태를 유지를 통해 응답 성능을 향상시키는 방법입니다.
* keep Alive time out내에 client에서 request를 재 요청하면 socket(port)를 새로 여는 것이 아니라 이미 열려 있는 socket(port)에 전송하게 됩니다.
* A – B가 서로 Connection이 Establish된 상태에서 (3-handshake) 지정된 시간(OS 설정 값 또는 어플리케이션 설정) 동안 서로 패킷 교환(Exchange)이 없을경우 payload가 없는 probe 패킷을 보냅니다.
* 만약 정상일 경우 connection을 유지하고, 그렇지 않을 경우는 장애로 판단해서 본인 Connection도 close 합니다.

* TCP 3-way handshake
![apache-keep](https://taetaetae.github.io/2017/08/28/apache-keep-alive/keepalive_on_off.png)

### 문서

* [Istio Circuit Breaking](https://istio.io/docs/tasks/traffic-management/circuit-breaking/)
* [Envoy Circuit Breaking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking)
* [KeepAlive on or off ? Apache Tuning](https://www.svennd.be/keepalive-on-or-off-apache-tuning/)
* [tcp keepalive와 nginx keepalive](https://brunch.co.kr/@alden/9)
* [나만 모르고 있던 - HTTP/2](https://www.popit.kr/나만-모르고-있던-http2/)
* [Istio로 Java 마이크로 서비스 의 회복 탄력성 및 내결함성 높이기](https://developer.ibm.com/kr/journey/make-java-microservices-resilient-with-istio/)
* [Enable your Java microservices with advanced resiliency features leveraging Istio](https://github.com/IBM/resilient-java-microservices-with-istio)
