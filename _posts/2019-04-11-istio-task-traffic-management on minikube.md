---
title:  "[Istio/task] Traffic Management on minikube"
date:   2019/04/11 18:10
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","install","쿠버네티스","이스티오","minikube"]
description: "minikube 에서 Istio 공식 TASK > Traffic Management 문서 Istio Traffic Management 를 토대로 minikube 환경에서 실행해보고 개인적으로 정리한 내용을 공유합니다."
---

# Traffic Management
---
* *docker engine 18.06.2-ce*, *kubernetes 1.13.4*, *Istio 1.1.1* , *minikube v0.35.0*, *macOS Mojave 10.14.4(18E226)*
* [[Istio 공식 TASK > Traffic Management 문서](https://istio.io/docs/tasks/traffic-management/) 를 토대로 minikube 환경에서 실행해보고 개인적으로 정리해 본 문서


## Configuring Request Routing
***
이 Task는 다중 microservice에 대한 요청을 다이나믹하게 라우팅하는 예제를 보여준다.

### 개요

* BookInfo 서비스는 화면 Review 부분은 3개의 다른 버전의 microservice로 구성되어 있으며 브라우저에서 /productpage URL에 대해 refresh를 2,3번 할 때마다 reviews 부문이 변경된다. 그 이유는 라우딩하기 위한 기본 서비스 버전을 명확히 지정해주지 않았기 때문에  Istio는 모든 버전의 microservice들을  round-robin 방식으로 라우딩하기 때문이다.
* 시나리오 #1 -  모든 요청 트래픽을 v1 microservice 로 라우딩 한다.
* 시나리오 #2 - HTTP Header의 값으로 요청을 구분하고 해당 요청에 대해서는 v2 microservice 로 라우팅을 분리한다.


### Destination Rule 적용/확인

* bookinfo  서비스에 대한 default Destination Rule 적용/확인

~~~
$ kubectl apply -f samples/bookinfo/networking/destination-rule-all.yaml
$ kubectl get destinationrules -o yaml
~~~


### 시나리오 #1 실행
모든 요청 트래픽을 v1 microservice 로 라우딩

* 모든 트래픽을 v1으로 라우팅되도록 VirtualService 적용

~~~
kubectl apply -f samples/bookinfo/networking/virtual-service-all-v1.yaml
~~~

* 브라우저에서 /productpage를 refresh하면 이전처럼 reviews 번갈아 변경되는 것이 아니라 reviews v1이 계속 표시된다.

### 시나리오 #2 실행
HTTP Header의 값으로 요청을 구분하고 해당 요청에 대해서는 v2 microservice 로 라우팅을 분리

* jason으로 로그인 한 경우(HTTP의 커스텀 헤더로 매치) 는 v2를 아닌 경우는 v1을 display 하도록  reviews 부분 VirtualService 수정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
EOF
~~~
* /productpage 에서 오른쪽 상단 로그인 링크를 클릭하고 로그인화면에서  아이디에 "jason" 을 입력하고 로그인 한다.
* refresh 하면 v2 microservice(검은색 별)를 표시한다.



## Fault Injction
***
어플리케이션의 자연복원을 테스트하기 위해 오류를 발생시키는 (fault inject) 방법을 보여준다.

### 개요

* BookInfo 어플리케이션은 ratings microservice 조회 제한시간 7초 로 지정되어 있으며 timeout 발생 시 오류 메시지를 표시하도록 되어 있다.
* 시나리오 #1 - jason으로 로그인한 경우(HTTP end-user 커스텀 헤더) 만 ratings microservice 조회에 대한 연결지연(7초이내)을 고의로 발생시킨다.
* 시나리오 #2 - jason으로 로그인한 경우(HTTP end-user 커스텀 헤더) 만 500에러를 고의로 발생시킨다.


### 시나리오 #1 실행
ratings microservice 연결지연(7초이내)을 고의로 발생

* jason으로 로그인 한 경우(HTTP의 커스텀 헤더로 매치) 연결지연(7초이내)을 고의로 발생시키도록  ratings microservice의 VirtualService 수정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ratings
spec:
  hosts:
  - ratings
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    fault:
      delay:
        percentage:
          value: 100.0
        fixedDelay: 7s
    route:
    - destination:
        host: ratings
        subset: v1
  - route:
    - destination:
        host: ratings
        subset: v1
EOF
~~~

* /productpage 에서 로그인 안한 상태나 jason이 아닌 아이디로 로그인 했을 경우는 정상 화면 표시
* jason으로 로그인 했을 경우는 7초 deploy 이후 에러 메시지(Sorry, product reviews are currently unavailable for this book.") 표시

### 시나리오 #2 실행
ratings microservice  500에러를 고의로 발생

* jason으로 로그인 한 경우(HTTP의 커스텀 헤더로 매치) 500에러를 고의로 발생시키도록 ratings microservice의 VirtualService 수정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ratings
spec:
  hosts:
  - ratings
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    fault:
      abort:
        percentage:
          value: 100.0
        httpStatus: 500
    route:
    - destination:
        host: ratings
        subset: v1
  - route:
    - destination:
        host: ratings
        subset: v1
EOF
~~~

* /productpage 에서 로그인 안한 상태나 jason이 아닌 아이디로 로그인 했을 경우는 정상 화면
* jason으로 로그인 했을 경우는 에러메시지("Ratings service is currently unavailable") 표시


## Traffic Shifting
***
이 Task는 이전 버전에서 다른 버전으로 트래픽을 서서 마이그레이션 하는 방법을 보여준다. 

### 개요

* reviews microservice를 v1, v2를 50:50 확률로 표시한다.


### 실행

* 모든 트래픽을 v1으로 라우팅되도록 VirtualService 적용

~~~
kubectl apply -f samples/bookinfo/networking/virtual-service-all-v1.yaml
~~~

* reviews microservice 의  v1 과 v2 를 50:50 으로 라우딩 되도록 VirtualService 적용

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 50
    - destination:
        host: reviews
        subset: v3
      weight: 50
EOF
~~~

* /productpage 를 reviews 부분이 refresh 하면 v1과 v3(붉은색 별) 화면이 50:50 확률로 표시된다.


## TCP Traffic Shifting
***
이 Task는 이전 버전에서 다른 버전으로 TCP 트래픽을 서서히 마이그레이션 하는 방법을 보여준다. 


### 개요

*  tcp-echo microservice 생성하고 v1 으로 100% 트래픽을 전달한 결과와 v2로 20%를 분산시킨 결과를 비교 확인한다.

### 실행

* TCP  테스트 어플 설치

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/tcp-echo/tcp-echo-services.yaml)
~~~

* TCP traffic to tcp-echo V1 microservice로 전달되도록 Gateway, DestinationRule, VirtualService 적용

~~~
$ kubectl apply -f <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: tcp-echo-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 31400
      name: tcp
      protocol: TCP
    hosts:
    - "*"
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: tcp-echo-destination
spec:
  host: tcp-echo
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
  name: tcp-echo
spec:
  hosts:
  - "*"
  gateways:
  - tcp-echo-gateway
  tcp:
  - match:
    - port: 31400
    route:
    - destination:
        host: tcp-echo
        port:
          number: 9000
        subset: v1
EOF
~~~

* tcp-echo microservice 로 트래픽 전달하고 결과를 확인

~~~
$ export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.clusterIP}')
$ export  INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="tcp")].port}')
for i in {1..10}; do \
  docker run -e INGRESS_HOST=$INGRESS_HOST -e INGRESS_PORT=$INGRESS_PORT -it --rm busybox sh -c "(date; sleep 1) | nc $INGRESS_HOST $INGRESS_PORT"; \
done
~~~

* tcp-echo microservice 의 트래픽을  v2 로 20% 가도록 VirtualService 적용

~~~
$ kubectl apply -f <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: tcp-echo
spec:
  hosts:
  - "*"
  gateways:
  - tcp-echo-gateway
  tcp:
  - match:
    - port: 31400
    route:
    - destination:
        host: tcp-echo
        port:
          number: 9000
        subset: v1
      weight: 80
    - destination:
        host: tcp-echo
        port:
          number: 9000
        subset: v2
      weight: 20
EOF
~~~

* tcp-echo microservice 로 트래픽 전달하고 결과를 확인하고 비교

~~~
$ for i in {1..10}; do \
docker run -e INGRESS_HOST=$INGRESS_HOST -e INGRESS_PORT=$INGRESS_PORT -it --rm busybox sh -c "(date; sleep 1) | nc $INGRESS_HOST $INGRESS_PORT"; \
done
~~~


## Setting Request Timeouts
***
이 TASK는 요청 제한시간를 샛팅하는 방법을  보여준다.

### 개요

* rationgs microservice 에 강제로 delay을 지정하고 reviews microservice 에 제한시간을 지정하여 오류를 확인한다.

### 실행

* 모든 트래픽을 v1으로 라우팅되도록 VirtualService 적용

~~~
$ kubectl apply -f samples/bookinfo/networking/virtual-service-all-v1.yaml
~~~


* reviews 전체 요청을  v2로 라우딩 전환하도록 한다.
~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v2
EOF
~~~

* 브라우저에서 화면  refresh 하여 reviews v2로 라우딩되는지 확인한다.

* rating microservice에 강제로 2초의 deplay를 지정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ratings
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percent: 100
        fixedDelay: 2s
    route:
    - destination:
        host: ratings
        subset: v1
EOF
~~~

* 브라우저에서 화면을  refresh 하여 2초간의 delay가 되는지 확인한다.

* reviews v2 서비스에 제한시간을 지정 한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v2
    timeout: 0.5s
EOF
~~~

* 브라우저 refresh 하면 2초가 지났을 경우 에러메시지 표시 확인한다.


## Control Ingress Traffic
***
이 TASK는 Istion Gateway 를 활용하여 서비스메시 외부에 서비스를 노출하는 방법을 보여준다.

### 개요

* Kubernetes 환경에서  `Kubernetes Ingress Resources` 는 클러스터 외부에 노출하고자 할 때 명시적인 서비스이다. 그러나 Istio 서비스메시 환경에서는 `Istio Gateway` 로 불리는 보다 나은 다른 설정 모델 접근법을 사용한다.
* Gateway는  모니터링과 라우팅 룰 같은 Istio 특성들을  클러스터에 들어가는 트래픽에 적용한다.
* 예제는 Gateway에서 "httpbin.example.com" 도메인만  해당 VirtualService 로 라우팅되고 도메인 정보가 없는 요청은 404(Not Found) 리턴되는 것을 확인한다.

### Istio Gateway 배경 지식

Gateways in an Istio service mesh (출처:https://istio.io/blog/2018/v1alpha3-routing/)
![Gateways in an Istio service mesh](https://istio.io/blog/2018/v1alpha3-routing/gateways.svg)

GateWay, VirtualService, DestinationRule (v1alpha3 elements)간 관계
![Relationship between different v1alpha3 elements](https://istio.io/blog/2018/v1alpha3-routing/virtualservices-destrules.svg)

* Gateway
  * HTTP/TCP 프로토콜 지정
  * TLS  정의 (crt,key)
  * MESH 진입 포인트

* DestinationRule
  * subset을 정의한다. 이때 라벨링을 통해 정의한 subset에 해당하는 deployment를 지정함 (deployment에만 지정하는 것이 아닐 지도...)
  * 서비스로 트래픽을 포워딩하는 정책 결정 (loadbalancer)
  * 하나의 비즈니스서비스를 분산하는 개념 ??

* Virtual Service
  * 라우팅 룰 적용
    * Gateway 로부터 DestinationRule
    * MESH 외부 서비스 대상
  * 쿠키, 헤더, uri 등 활용

* ServiceEntry
  * 사용자서비스 Entry 포인트를 등록  
  * MESH 밖의 외부 서비스 (밖에만 지정하는건 아니겠지??? 아마도??)
  * 호스트 - 포트(번호, 프로토콜) 별로 지정 가능

* Kubernetes의  Ingress 에서  비즈니스서비스 구간을 3단계로 세분화 하고 각 단계별로 기능을 분리시킴
  * 프로토콜 단계 - Protocol, Port, TLS
  * 라우팅 단계 ? - Traffic Shifting, Fault Injection , Request Timeout
  * LB 단계 ? - 서비스로의 LB


### 사전준비

* minikube 환경에 istio-ingressgateway 를 NotePort 로 정의했으므로 아래와 같이 IP 와 Port 확인하고 환경변수에 지정한다. 

~~~
$ export INGRESS_HOST=$(minikube ip)
$ export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
~~~


### 실행

* 호스트명이 "httpbin.example.com"로 요청될 경우 이를 받아주는 Gateway 와 URL profix에 따라 destination을  지정하는 VirtualService를 생성(적용)한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: httpbin-gateway
spec:
  selector:
    istio: ingressgateway # use Istio default gateway implementation
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "httpbin.example.com"
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
spec:
  hosts:
  - "httpbin.example.com"
  gateways:
  - httpbin-gateway
  http:
  - match:
    - uri:
        prefix: /status
    - uri:
        prefix: /delay
    route:
    - destination:
        port:
          number: 8000
        host: httpbin
EOF
~~~

* /status/200 로 요청한 경우는 Code 200 (정상) 리턴되지만 /headers 와 같이 VirtualService에 정의되지 않는 prefix로 요청한 경우는 Code 404 (Not Found) 리턴되는 것을 확인한다.

~~~
$ curl -I -HHost:httpbin.example.com http://$INGRESS_HOST:$INGRESS_PORT/status/200
$ curl -I -HHost:httpbin.example.com http://$INGRESS_HOST:$INGRESS_PORT/headers
~~~

* /status/200 요청이지만 도메인정보가 없기 때문에 200 대신 404를 리턴되는 것을 확인한다. Gateway에서 블럭

~~~
$ curl -I http://$INGRESS_HOST:$INGRESS_PORT/status/200
~~~


## Securing Ingress Gateway (File Mount-based approch)
***
이 TASK 는  File Mount-Based 접근방식을 통해 Istio Ingress Gateway 에서 TLS(SSL)를 적용하는 방법을 보여준다.


### 개요

* 시나리오 #1 - TLS (SIMPLE) 설정
* 시나리오 #2 - mutual TLS 설정
* 시나리오 #3 - 멀티 호스트 TLS 설정

### 준비

* 이전 사용했던 gateway와 virtualservice 삭제

~~~
kubectl delete virtualservice httpbin
kubectl delete gateway httpbin-gateway
~~~

* 공통으로 사용할 virtualservice 신규 생성

~~~
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
spec:
  hosts:
  - "httpbin.example.com"
  gateways:
  - httpbin-gateway
  http:
  - match:
    - uri:
        prefix: /status
    - uri:
        prefix: /delay
    route:
    - destination:
        port:
          number: 8000
        host: httpbin
EOF
~~~

* 클라이언트/서버 인증서 생성
  * certificates and keys를 생성할 툴을 clone 하고 `generate.sh` 실행하고 프롬프트 나오면 모두 y 선택한다.
  * 1_root, 2_intermediate, 3_application, 4_client 4게의 서버와 클라이언트  certification 디렉토리가 생성된다.
~~~
cd ..
git clone https://github.com/nicholasjackson/mtls-go-example
cd mtls-go-example/
./generate.sh httpbin.example.com password1234
~~~

  * **Istio Ingress Gateway** 에 마운트 시킬 certification 디렉토리를 새로 생성하고 generate 결과물들을 해당 디렉토리로 이동한다.
~~~
mkdir ~+1/httpbin.example.com
mv 1_root 2_intermediate 3_application 4_client ~+1/httpbin.example.com
cd ~+1/
~~~

* 공통으로 사용할 IP, PORT 변수 확인한다.

~~~
export INGRESS_HOST=$(minikube ip)
export SECURE_INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="https")].nodePort}')
echo $INGRESS_HOST $SECURE_INGRESS_PORT
~~~


### 시나리오 #1 실행 - TLS (SIMPLE) 
File Mount-Based 접근방식을 통해 TLS ingress gateway (SIMPLE) 설정

* "istio-ingressgateway-certs" 란 이름으로  secret tls 생성

~~~
$ kubectl create -n istio-system secret tls istio-ingressgateway-certs --key httpbin.example.com/3_application/private/httpbin.example.com.key.pem --cert httpbin.example.com/3_application/certs/httpbin.example.com.cert.pem
~~~

* istio-system 네임스페이스에 istio-ingressgateway-certs 라는  secret 를  kubectl로 생성하면 istio-gateway는 자동으로 secret을 로드한다.
* 반드시 "istio-ingressgateway-certs" 라는  secret이라고 이름을 지정해야  default ingress gateway  에서 사용할 수 있다. (Istio 설치시 설정 옵션 default 값)
* secret위치도  ingress gateway 파드의 "/etc/istio/ingressgateway-certs/" 에 고정 (Istio 설치시 설정 옵션 default 값)

* secret 생성 확인 secret은  `/etc/istio/ingressgateway-certs` 위치에 마운트된다.

~~~
$ kubectl exec -it -n istio-system $(kubectl -n istio-system get pods -l istio=ingressgateway -o jsonpath='{.items[0].metadata.name}') -- ls -al /etc/istio/ingressgateway-certs
~~~

* Gateway 생성

~~~
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: httpbin-gateway
spec:
  selector:
    istio: ingressgateway # use istio default ingress gateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      serverCertificate: /etc/istio/ingressgateway-certs/tls.crt
      privateKey: /etc/istio/ingressgateway-certs/tls.key
    hosts:
    - "httpbin.example.com"
EOF
~~~

* 실행 및 결과확인

~~~
curl -v -HHost:httpbin.example.com \
--resolve httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST \
--cacert httpbin.example.com/2_intermediate/certs/ca-chain.cert.pem \
https://httpbin.example.com:$SECURE_INGRESS_PORT/status/418
~~~


### 시나리오 #2 실행 - mutual TLS
File Mount-Based 접근방식을 통해  mutual TLS ingress gateway 설정

* "istio-ingressgateway-ca-certs" 란 이름으로  secret tls 생성 및 확인

~~~
$ kubectl create -n istio-system secret generic istio-ingressgateway-ca-certs --from-file=httpbin.example.com/2_intermediate/certs/ca-chain.cert.pem
~~~

* Gateway 생성

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: httpbin-gateway
spec:
  selector:
    istio: ingressgateway # use istio default ingress gateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: MUTUAL
      serverCertificate: /etc/istio/ingressgateway-certs/tls.crt
      privateKey: /etc/istio/ingressgateway-certs/tls.key
      caCertificates: /etc/istio/ingressgateway-ca-certs/ca-chain.cert.pem
    hosts:
    - "httpbin.example.com"
EOF
~~~

* 실행

~~~
curl -HHost:httpbin.example.com \
--resolve httpbin.example.com:$SECURE_INGRESS_PORT:$INGRESS_HOST \
--cacert httpbin.example.com/2_intermediate/certs/ca-chain.cert.pem \
--cert httpbin.example.com/4_client/certs/httpbin.example.com.cert.pem \
--key httpbin.example.com/4_client/private/httpbin.example.com.key.pem \
https://httpbin.example.com:$SECURE_INGRESS_PORT/status/418
~~~


### 시나리오 #3 실행 - 다중 호스트

* gateway는 ingress gateway 파드에서 실행
* 멀티 도메인을 활용할 경우 인증서를 추가하게 되면 해당 인증서를 ingress gateway 파드에 새로 마운트 해주어야 한다.
* 아래는 디렉터리를 추가로 마운트하기 위해서 helm으로 ingressgateway yaml 을 신규 생성하여 설치하는 예

~~~
$  helm template $HOME/istio-fetch/istio --name istio --namespace istio-system -x charts/gateways/templates/deployment.yaml --set gateways.istio-egressgateway.enabled=false \
--set 'gateways.istio-ingressgateway.secretVolumes[0].name'=ingressgateway-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[0].secretName'=istio-ingressgateway-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[0].mountPath'=/etc/istio/ingressgateway-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[1].name'=ingressgateway-ca-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[1].secretName'=istio-ingressgateway-ca-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[1].mountPath'='/etc/istio/ingressgateway-ca-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[2].name'=ingressgateway-bookinfo-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[2].secretName'=istio-ingressgateway-bookinfo-certs \
--set 'gateways.istio-ingressgateway.secretVolumes[2].mountPath'=/etc/istio/ingressgateway-bookinfo-certs > \
$HOME/istio-ingressgateway.yaml

$ kubectl apply -f $HOME/istio-ingressgateway.yaml
~~~


## Securing Gateways with HTTPS Using Secret Discovery Service
***
이 TASK 는  SDS(Secret Discovery Service)를 사용하여 Istio Ingress Gateway 에서 TLS(SSL)를 적용하는 방법을 보여준다.


* gateways.istio-egressgateway.enabled=false로 gateways.istio-ingressgateway.sds.enabled=true 로 변경하여  istio-ingressgateway yaml을 생성한후 적용한다.

~~~
$ helm template install/kubernetes/helm/istio/ --name istio \
--namespace istio-system -x charts/gateways/templates/deployment.yaml \
--set gateways.istio-egressgateway.enabled=false \
--set gateways.istio-ingressgateway.sds.enabled=true > \
$HOME/istio-ingressgateway.yaml
$ kubectl apply -f $HOME/istio-ingressgateway.yaml
~~~

* TODO - https://istio.io/docs/tasks/traffic-management/secure-ingress/sds/


## Control Egress Traffic
***
Istio 에서 관리되는 파드들의  모든 outbound 트래픽은 기본적으로 sidecar proxy로 리디렉션되기 때문에, 클러스터 외부의 URL 접근성은 proxy의 구성에 따라 달라진다.

### 개요

* 설정하지 않았다면 서비스메시 내의 외부 요청은 envoy proxy 에서 모두 허용됨
* ServiceEntries 설정을 통하여 외부 서비스 컨트럴 접근 통제를 제공
* IP 범위 설정으로  bypass 처리

* 시나리오 #1 - Envoy를 통한 외부 서비스 접근 옵션을 조회하고 외부 접근이 가능한지 확인한다.
* 시나리오 #2  - 외부 서비스 접근 정책을 REGISTRY_ONLY 로 변경하고 외부 접근이 불가능한지 확인한다.
* 시나리오 #3 - 외부 서비스 접근 정책 REGISTRY_ONLYHTTP 상태에서 ServiceEntry 등록을 통해 외부 가능 서비스 등록한다.
* 시나리오 #4 - 외부 서비스 호출시  제한시간을 설정한다.

### 준비작업

* 샘플 어플 설치하고 해당 파드이름을 환경변수 SOURCE_POD 에 지정

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/sleep/sleep.yaml)
$ export SOURCE_POD=$(kubectl get pod -l app=sleep -o jsonpath={.items..metadata.name})
~~~


### 시나리오 #1 실행
Envoy를 통한 외부 서비스 접근 옵션을 조회하고 외부 접근이 가능한지 확인한다.

* 현재 설정된 외부접근 옵션 확인 (default : ALLOW_ANY) 한다.

~~~
$ kubectl get configmap istio -n istio-system -o yaml | grep -o "mode: ALLOW_ANY"
~~~

* ALLOW_ANY 상태에서  외부 서비스 호출 가능 여부 확인한다.

~~~
$ kubectl exec -it $SOURCE_POD -c sleep -- curl -I https://www.google.com | grep  "HTTP/"; kubectl exec -it $SOURCE_POD -c sleep -- curl -I https://edition.cnn.com | grep "HTTP/"
~~~

* 모두 200 출력하여 호출가능상태임을 확인


### 시나리오 #2 실행
외부 서비스 접근 정책을 REGISTRY_ONLY 로 변경하고 외부 접근이 불가능한지 확인한다.

* global.outboundTrafficPolicy.mode를 REGISTRY_ONLY로 변경하여 재 설정, 변경에 시간이 걸림

~~~
$ kubectl get configmap istio -n istio-system --export -o yaml | sed 's/mode: ALLOW_ANY/mode: REGISTRY_ONLY/g' | kubectl replace -n istio-system -f -
~~~

* 외부  서비스 호출 가능 여부 확인

~~~
$ kubectl exec -it $SOURCE_POD -c sleep -- curl -I https://www.google.com | grep  "HTTP/"; kubectl exec -it $SOURCE_POD -c sleep -- curl -I https://edition.cnn.com | grep "HTTP/"
~~~

* 외부 서비스가 막혀 `command terminated with exit code 35` 메시지가 표시된다.


### 시나리오 #3
외부 서비스 접근 정책 REGISTRY_ONLYHTTP 상태에서 ServiceEntry 등록을 통해 외부 가능 서비스 등록한다.

* 외부접근 기본값이 REGISTRY_ONLY 로 지정된 경우 외부 HTTP, HTTPS 서비스에 접근하기 위해서는 접근 호스트, 프로토콜별 ServiceEntry 를 생성해 준다.

* 외부접근을 위한 ServiceEntry 생성하고 외부서비스로는 httpbin.org (http://httpbin.org)  를 지정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: httpbin-ext
spec:
  hosts:
  - httpbin.org
  ports:
  - number: 80
    name: http
    protocol: HTTP
  resolution: DNS
  location: MESH_EXTERNAL
EOF
~~~

* 등록된 ServiceEntry에 대해 서비스 가능 여부를 확인한다. 이때 반영시간이 있으므로 주의

~~~
$ kubectl exec -it $SOURCE_POD -c sleep -- curl -I http://httpbin.org/status/200
$ kubectl exec -it $SOURCE_POD -c sleep -- curl https://httpbin.org/headers
~~~

* ServiceEntry 에 설정된대로 HTTP는 정상호출, HTTPS 호출 블가능(Code 35)함을 확인한다.


* 외부 서비스 httpbin.org 에  HTTPS 허용으로 변경한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: httpbin-ext
spec:
  hosts:
  - httpbin.org
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
EOF
~~~

* 등록된 ServiceEntry에 대해 서비스 가능 여부를 확인한다. 이때 반영시간이 있으므로 주의

~~~
kubectl exec -it $SOURCE_POD -c sleep -- curl https://httpbin.org/headers
kubectl exec -it $SOURCE_POD -c sleep -- curl -I http://httpbin.org/status/200
~~~

* ServiceEntry 에 설정된대로 HTTP는 호출불가(code 404), HTTPS 호출 가능함을 확인한다.


### 시나리오 #4
외부 서비스 호출시  제한시간을 설정한다.

* sleep 파드에서 5초 delay 되는  request를 요청하면 5초후 정상 결과 리턴 (200번)된댜.

~~~
$ kubectl exec -it $SOURCE_POD -c sleep sh
$ time curl -o /dev/null -s -w "%{http_code}\n" http://httpbin.org/delay/5
$ exit
~~~


* VirtualService 에  httpbin.org 외부서비스 요청에 제한시간 3 초를 지정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin-ext
spec:
  hosts:
    - httpbin.org
  http:
  - timeout: 3s
    route:
      - destination:
          host: httpbin.org
        weight: 100
EOF
~~~

* 앞서 실행했던 sleep 파드에서 5초 delay 되는  request를 요청하면 이전과 달리 제한시간으로 지정된 약 3초 후 오류코드 503 가 표시된다.

~~~
$ kubectl exec -it $SOURCE_POD -c sleep sh
$ time curl -o /dev/null -s -w "%{http_code}\n" http://httpbin.org/delay/5
$ exit
~~~


## Circuit Breaking
***
이 TASK는 연결,요청에 따른 circuit breaking 설정을 보여준다.

### 개요

* DestinationRule 에 허용 연결과 요청수를 작게한후 클라이언트(fortio)  에서 서버(httpbin) 로 연결정보 및 요청수를 늘려가면서 circuit breaking 되는 현상을 조회한다.


### 실행

* Circuit Breaking을 발생시키지 위한 Destination Rule 적용
* maxConnections: 1 and http1MaxPendingRequests: 1
* 1개의 커넥션과  1개 동시요청이 넘을 경우 istio-proxy가 추가요청을 연결을 하게되어 오류 발생 시키게 된다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: httpbin
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1
      http:
        http1MaxPendingRequests: 1
        maxRequestsPerConnection: 1
    outlierDetection:
      consecutiveErrors: 1
      interval: 1s
      baseEjectionTime: 3m
      maxEjectionPercent: 100
EOF
~~~


* httpbin으로 요청하고 결과를 측정할 클라이언트 어플(fortio) 설치

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/httpbin/sample-client/fortio-deploy.yaml)
~~~

* 결과 확인위해 클라이언트(Fortio)에서 서비스(httpbin)으로 단건 요청해보면 200 코드 결과를 리턴한다.

~~~
$ export FORTIO_POD=$(kubectl get pod | grep fortio | awk '{ print $1 }')
# kubectl exec -it $FORTIO_POD  -c fortio /usr/bin/fortio -- load -curl  http://httpbin:8000/get
~~~

* 클라이언트(Fortio)에서 서비스(httpbin) 커넥션과 Request 수를 늘려가면서 요청성공(Code 200)과 실패(code 503) 결괄를 확인

~~~
$ kubectl exec -it $FORTIO_POD  -c fortio /usr/bin/fortio -- load -c 2 -qps 0 -n 20 -loglevel Warning http://httpbin:8000/get
$ kubectl exec -it $FORTIO_POD  -c fortio /usr/bin/fortio -- load -c 3 -qps 0 -n 30 -loglevel Warning http://httpbin:8000/get
~~~


* 클라이언트(Frotio) 파드에서 상태값 중에서 httpbin 에 호출값 중  pending 상태 값을 조회
* 결과중 `upstream_rq_pending_overflow` 값이 circuit breaking 수행 결과임

~~~
$ kubectl exec -it $FORTIO_POD  -c istio-proxy  -- sh -c 'curl localhost:15000/stats' | grep httpbin | grep pending
~~~


## Mirroring (Traffic Mirroring, Shadowing)
***
이 TASK는 Istio의 트래픽 미러링 역량을 보여준다.

### 개요

* 미러링 할 2개의 microservice(httpbin) 를 준비하고 클라이언트 역할을 할 sleep 서비스를 준비한다.


## 준비작업

* 미러링 될 microservice 2개(httpbin-v1, httpbin-v2)를 준비한다. 

~~~
$ cat <<EOF | istioctl kube-inject -f - | kubectl create -f -
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: httpbin-v1
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: httpbin
        version: v1
    spec:
      containers:
      - image: docker.io/kennethreitz/httpbin
        imagePullPolicy: IfNotPresent
        name: httpbin
        command: ["gunicorn", "--access-logfile", "-", "-b", "0.0.0.0:80", "httpbin:app"]
        ports:
        - containerPort: 80
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: httpbin-v2
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: httpbin
        version: v2
    spec:
      containers:
      - image: docker.io/kennethreitz/httpbin
        imagePullPolicy: IfNotPresent
        name: httpbin
        command: ["gunicorn", "--access-logfile", "-", "-b", "0.0.0.0:80", "httpbin:app"]
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
  ports:
  - name: http
    port: 8000
    targetPort: 80
  selector:
    app: httpbin
EOF
~~~


* 클라이언트 역할을 할 sleep 어플를 준비한다. 

~~~
$ cat <<EOF | istioctl kube-inject -f - | kubectl create -f -
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: sleep
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: sleep
    spec:
      containers:
      - name: sleep
        image: tutum/curl
        command: ["/bin/sleep","infinity"]
        imagePullPolicy: IfNotPresent
EOF
~~~

### 실행

* 모든 트래픽을 httpbin-v1 으로 라우딩하도록 지정하기 위해서 DestinationRule 과 VirtualService 적용한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
spec:
  hosts:
    - httpbin
  http:
  - route:
    - destination:
        host: httpbin
        subset: v1
      weight: 100
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: httpbin
spec:
  host: httpbin
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
EOF
~~~

* sleep 파드에서 httpbin 으로 요청 (2회 이상) 해 본다.

~~~
$ export SLEEP_POD=$(kubectl get pod -l app=sleep -o jsonpath={.items..metadata.name})
$ kubectl exec -it $SLEEP_POD -c sleep -- sh -c 'curl  http://httpbin:8000/headers'
~~~


* V2 파드에는 요청 로그가 없음을 확인한다.

~~~
$ export V1_POD=$(kubectl get pod -l app=httpbin,version=v1 -o jsonpath={.items..metadata.name})
$ export V2_POD=$(kubectl get pod -l app=httpbin,version=v2 -o jsonpath={.items..metadata.name})
$ kubectl logs -f $V1_POD -c httpbin | grep  "GET /headers"
$ kubectl logs -f $V1_POD -c httpbin | grep  "GET /headers"
~~~

* httpbin-v2로 미러링 되도록 VirtualService 수정 적용한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
spec:
  hosts:
    - httpbin
  http:
  - route:
    - destination:
        host: httpbin
        subset: v1
      weight: 100
    mirror:
      host: httpbin
      subset: v2
EOF
~~~

* 동일한 방식으로 sleep 파드에서 httpbin 으로 요청 (2회 이상) 트래픽을 전달한다.

~~~
$ kubectl exec -it $SLEEP_POD -c sleep -- sh -c 'curl  http://httpbin:8000/headers' | python -m json.tool
~~~

$ httpbin-v2 파드에서 v1로가는 미러링 요청을 확인한다.

~~~
$ kubectl logs -f $V1_POD -c httpbin
$ kubectl logs -f $V2_POD -c httpbin
~~~
