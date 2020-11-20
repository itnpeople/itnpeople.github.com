---
title:  "Istio 연습과제 - Authentication Policy"
date:   2019/04/25 09:20
categories: "cloud"
tags: []
keywords: ["istio","kubernetes","install","쿠버네티스","이스티오","minikube","authentication"]
description: "Istio는  서비스와 서비스간의  'Transport authentication', end-user 와 서비스간의 'Origin authentication' 2가지 인증처리 기능을 제공하고 있으며 MeshPolicy, Policy, DestinnationRule 3가지 CDR(Custom Define Resource)을 활용하여 인증 환경을 구성할 수 있습니다."
---

# Istio 연습과제 - Authentication Policy
*docker engine 18.06.2-ce*, *kubernetes 1.14.0*, *Istio 1.1.1*, *minikube v1.0.0* , *macOS Mojave 10.14.4(18E226)*

Istio는  서비스와 서비스간의  'Transport authentication', end-user 와 서비스간의 'Origin authentication' 2가지 인증처리 기능을 제공하고 있으며 MeshPolicy, Policy, DestinnationRule 3가지 CDR(Custom Define Resource)을 활용하여 인증 환경을 구성할 수 있습니다.



## 개요
***

* Istio 는 두가지 형태의 인증을 제공

  1. Transport authentication : 서비스와 서비스 간 인증
  1. Origin authentication : 클라이언트(사용자 또는 디바이스 요청)을 인증(end-user authentication)

* _MeshPolicy_, _Policy_ 에서 authentication 정책 및 범위를 지정하고 _DestinationRule_ 에서 인증처리(통과)를 위한 인증방법을 정의


### Policy 
* Scope
  * `kind: MeshPolicy` : Mesh 에 적용
  * `kind: Policy` : Namespace 에 적용
* Target selectors
  * 적용하는 대상 서비스 또는 서비스와 포트를 세부 지정할 수 있습니다.
  * "selector"를 통해 0~n 개의 적용 서비스를 특정할 수 있음 (Service-specific policy)
* peer
  * service-to-service 인증을 위한 method를 지정
  * 현재 지원되는 인증방법은 mutual TLS
* origins
  * origins(end-user) authentication 인증을 위한 설정
  * Istio 에서는 JWT authentication만 지원
* Principal binding
  * USE_PEER, USE_ORIGIN

### 참고
* [JSON Web Token (JWT)란 무엇인가?](https://harfangk.github.io/2016/10/16/what-is-jwt-ko.html)


## 준비작업
***

* minikube 준비

~~~
$ minikube start --cpus 4 --memory 8192 -p istio-security
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

* Istio 설치

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~


* Istio 파드 정상상태 확인 및 대기

~~~
$ kubectl get pod -n istio-system
~~~

* 연습용 어플 설치
  * 클라이언트, 서버 역할을 할 파드 2개를 3개 Namespace(foo, bar, legacy) 에 설치
  * foo, bar Namespace 서비스들은  sidecar injection (이하 **Istio-service**)
  * legacy Namespace 서비스들은 sidecar 제외 (이하 **non-Istio-service**)

~~~
$ kubectl create ns foo
$ kubectl apply -f <(istioctl kube-inject -f samples/httpbin/httpbin.yaml) -n foo
$ kubectl apply -f <(istioctl kube-inject -f samples/sleep/sleep.yaml) -n foo
$ kubectl create ns bar
$ kubectl apply -f <(istioctl kube-inject -f samples/httpbin/httpbin.yaml) -n bar
$ kubectl apply -f <(istioctl kube-inject -f samples/sleep/sleep.yaml) -n bar
$ kubectl create ns legacy
$ kubectl apply -f samples/httpbin/httpbin.yaml -n legacy
$ kubectl apply -f samples/sleep/sleep.yaml -n legacy
~~~


* 각 설정에 따라 각 서비스간 인증 여부를 확인용 쉘스크립트 작성
  * foo, bar, legacy Namespace 별  sleep 서비스에서 httpbin 서비스 호출여부를 확인하는 역할

~~~
$ vi security-check.sh
~~~

~~~
for from in "foo" "bar" "legacy"
    do
    echo "[${from}]"
    for to in "foo" "bar" "legacy"
        do
       kubectl exec $(kubectl get pod -l app=sleep -n ${from} -o jsonpath={.items..metadata.name}) -c sleep -n ${from} -- curl "http://httpbin.${to}:8000/ip" -s -o /dev/null -w "  * ${from}->${to}: %{http_code}\n";
        done
    done
~~~

* 실행 권한

~~~
$ chmod +x security-check.sh
~~~


* 확인용 쉘스크립트 실행
  * 아래와 같이 각 Namespace들의  sleep 파드에서 각 Namespace들의 httpbin 파드로 요청하면 아무런 제약없이 모두 `200` 리턴 확인

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 200
  * foo->bar: 200
  * foo->legacy: 200
[bar]
  * bar->foo: 200
  * bar->bar: 200
  * bar->legacy: 200
[legacy]
  * legacy->foo: 200
  * legacy->bar: 200
  * legacy->legacy: 200
  ~~~


## Mesh에  mutual TLS 적용
***

### #1. Mesh 에 mutual TLS를 적용하여 Mesh 내 서비스간 Authentication 이 변경되는지 확인

* Mesh 인증정책을 지정하기 위해서는 아래와 같이  _MeshPolicy_ 을 적용

~~~
$ kubectl apply -f - <<EOF
apiVersion: "authentication.istio.io/v1alpha1"
kind: "MeshPolicy"
metadata:
  name: "default"
spec:
  peers:
  - mtls: {}
EOF
~~~

* 적용결과 확인 
  * 적용 시간이 있으므로 잠시대기 후 결과 확인
  * 호출되는 **Istio-service** 는 내/외부 상관없이 코드 `503` (Service Unavailable)
  * **Istio-service** 에서 **non-Istio-service** 호출은  코드 `200` (정상) 
  * **non-Istio-service** 에서  Istio 서비스를  호출 하는 경우는 코드 `56` (CURLE_RECV_ERROR, Failure with receiving network data)

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 503
  * foo->bar: 503
  * foo->legacy: 200
[bar]
  * bar->foo: 503
  * bar->bar: 503
  * bar->legacy: 200
[legacy]
  * legacy->foo: 000
command terminated with exit code 56
  * legacy->bar: 000
command terminated with exit code 56
  * legacy->legacy: 200
~~~

### #2. Mesh내 서비스간 Authentication 통과되도록 설정

* 아래와 같이 _DestinationRule_ 에 trafficPolicy TLS 모드를 `ISTIO_MUTUAL` 모드로 지정.
* Mesh 내 _DestinationRule_ 은 Namespace _istio-system_ 에 지정한다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: "networking.istio.io/v1alpha3"
kind: "DestinationRule"
metadata:
  name: "default"
  namespace: "istio-system"
spec:
  host: "*.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
EOF
~~~

* 참고 - TLS mode 
  * TLS connection mode
  * `DISABLE`	: upstream endpoint에 대한 TLS  연결을  disable 지정
  * `SIMPLE` : Originate a TLS connection to the upstream endpoint.
  * `MUTUAL` : 클라이언트 존재하는 인증서로  mutual TLS 을 사용하여 upstream 보안 연결.
  * `ISTIO_MUTUAL` : `MUTUAL`와 유사, 다른점은 Istio mTLS 인증에 의해 자동 생성된 인증서를 사용, 이 모드를 사용하면 TLSSettings 시 다른 모든 필드를 비워두어야 합니다.


* 아래 명령으로 기본 **default** _DestinationRule_ 이 생성됨을 확인 할 수 있습니다.
~~~
$ kubectl get dr -n istio-system
~~~

* 결과 확인
  * **Istio-service** 간 호출은 `503`에서 `200`으로 전환
  * **non-Istio-service**  호출은 `200`에서 `503`으로 전환
  * **non-Istio-service** 에서 **Istio-service**  호출은 여전히 불가 (`56`)

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 200
  * foo->bar: 200
  * foo->legacy: 503
[bar]
  * bar->foo: 200
  * bar->bar: 200
  * bar->legacy: 503
[legacy]
  * legacy->foo: 000
command terminated with exit code 56
  * legacy->bar: 000
command terminated with exit code 56
  * legacy->legacy: 200
  ~~~

### #3. Istio-service에서 non-Istio-service로 요청 가능하도록 설정

* 아래와 같이 특정 **non-Istio-service** 에 _DestinationRule_ 의 TLS 모드를  **DISABLE** 모드로 지정하여  **Istio-service** 에서 **non-Istio-service** 의 호출을 가능하도록 조정합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
 name: "httpbin-legacy"
 namespace: "legacy"
spec:
 host: "httpbin.legacy.svc.cluster.local"
 trafficPolicy:
   tls:
     mode: DISABLE
EOF
~~~

* 결과확인
  * _foo->legacy_, _bar->legacy_ 요청이 코드 `200`(정상)으로 반환됨을 확인.

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 200
  * foo->bar: 200
  * foo->legacy: 200
[bar]
  * bar->foo: 200
  * bar->bar: 200
  * bar->legacy: 200
[legacy]
  * legacy->foo: 000
command terminated with exit code 56
  * legacy->bar: 000
command terminated with exit code 56
  * legacy->legacy: 200
~~~


### Istio 서비스 에서 Kubernetes API server 호출

* Kubernetes API server 는 sidecar가 존재하지 않는다 그러므로 아래와 같이 sidecar injection 되어있는 foo Namespace 의 sleep 서비스에서 api-server 를 호출하면 `33` (CURLE_SSL_CONNECT_ERROR) 에러가 발생.

~~~
$ TOKEN=$(kubectl describe secret $(kubectl get secrets | grep default-token | cut -f1 -d ' ' | head -1) | grep -E '^token' | cut -f2 -d':' | tr -d '\t')
$ kubectl exec $(kubectl get pod -l app=sleep -n foo -o jsonpath={.items..metadata.name}) -c sleep -n foo -- curl https://kubernetes.default/api --header "Authorization: Bearer $TOKEN" --insecure -s -o /dev/null -w "%{http_code}\n"
~~~

* **Istio-service** 에서 API-server 호출시 authentication 오류가 발생하지 않도록 하기 위해서
  * 아래와 같이 Kubernetes API server 서비스 (`kubernetes.default`) 에 _DestinationRule_ 을 등록하고 TLS 를 **DISABLE** 모드로 지정.
  * 하여 코드 `200`(정상) 반환되어야 하는데 실제로는 코드 `403`가 리턴된다. API 요청 URL 권한 문제인 것으로 판단하여 일단 성공한 것으로 판단

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
 name: "api-server"
 namespace: istio-system
spec:
 host: "kubernetes.default.svc.cluster.local"
 trafficPolicy:
   tls:
     mode: DISABLE
EOF
~~~

~~~
$ kubectl exec $(kubectl get pod -l app=sleep -n foo -o jsonpath={.items..metadata.name}) -c sleep -n foo -- curl https//kubernetes.default/api --header "Authorization: Bearer $TOKEN" --insecure -s
~~~


### cleanup

* 연습 리소스 삭제
  * _./security-check.sh_ 실행히여 cleanup 샹태 - 전체 리턴 코드 `200`(정상) - 여부 확인

~~~
$ kubectl delete meshpolicy default
$ kubectl delete dr httpbin-legacy -n legacy
$ kubectl delete dr default -n istio-system
$ kubectl delete dr api-server -n istio-system
$ ./security-check.sh
~~~


## Namespace 또는 Service 에 mutual TLS 적용
***

### #1. foo Namespace에  policy 적용

* Namespace에  _Policy_ 정의하고 _DestinationRule_ 정의를 통하여 TLS 적용

~~~
$ kubectl apply -f - <<EOF
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "default"
  namespace: "foo"
spec:
  peers:
  - mtls: {}
EOF
~~~

* 결과 확인
  * _Policy_ 를 적용한 "foo"의 서비스 호출 시 코드 `503`, `56` 발생

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 503
  * foo->bar: 200
  * foo->legacy: 200
[bar]
  * bar->foo: 503
  * bar->bar: 200
  * bar->legacy: 200
[legacy]
  * legacy->foo: 000
command terminated with exit code 56
  * legacy->bar: 200
  * legacy->legacy: 200
~~~

### #2. foo Namespace httpbin 서비스가 authentication 통과되도록 설정

* 아래와 같이 Istio-service Default _DestinationRule_ 에 TLS - `ISTIO_MUTUAL` 모드 지정

~~~
$ kubectl apply -f - <<EOF
apiVersion: "networking.istio.io/v1alpha3"
kind: "DestinationRule"
metadata:
  name: "default"
  namespace: "foo"
spec:
  host: "*.foo.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
EOF
~~~


* 결과 확인
  * **Istio-service** 에서 호출은 `200`(정상)으로 전환 
  * **non-Istio-service** 에서 호출하는 경우는 여전히 오류 발생

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 200
  * foo->bar: 200
  * foo->legacy: 200
[bar]
  * bar->foo: 200
  * bar->bar: 200
  * bar->legacy: 200
[legacy]
  * legacy->foo: 000
command terminated with exit code 56
  * legacy->bar: 200
  * legacy->legacy: 200
~~~


### #3. bar Namespace 의  httpbin 서비스에 policy 적용

* "bar" Namespace의 특정 서비스(httpbin)에  _Policy_ 적용

~~~
$ cat <<EOF | kubectl apply -n bar -f -
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "httpbin"
spec:
  targets:
  - name: httpbin
  peers:
  - mtls: {}
EOF
~~~

* 결과 확인
  * bar 네임스페이스 서비스 호출하는 경우도 `503`, `56`오류 발생

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 200
  * foo->bar: 503
  * foo->legacy: 200
[bar]
  * bar->foo: 200
  * bar->bar: 503
  * bar->legacy: 200
[legacy]
  * legacy->foo: 000
command terminated with exit code 56
  * legacy->bar: 000
command terminated with exit code 56
  * legacy->legacy: 200
~~~

### #4. bar Namespace httpbin 서비스가  authentication 통과되도록 설정

* 아래와 같이  bar Namespace 의 _DestinationRule_ 에 "httpbin" 서비스에 대한 TLS 를 `ISTIO_MUTUAL`로 지정

~~~
$ cat <<EOF | kubectl apply -n bar -f -
apiVersion: "networking.istio.io/v1alpha3"
kind: "DestinationRule"
metadata:
  name: "httpbin"
spec:
  host: "httpbin.bar.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
EOF
~~~

* 결과 확인
  * **Istio-service** 간 호출시에 `503` 에러 없어지고
  * **non-Istio-service** 에서 호출하는 경우는 여전히 오류 발생

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 200
  * foo->bar: 200
  * foo->legacy: 200
[bar]
  * bar->foo: 200
  * bar->bar: 200
  * bar->legacy: 200
[legacy]
  * legacy->foo: 000
command terminated with exit code 56
  * legacy->bar: 000
command terminated with exit code 56
  * legacy->legacy: 200
~~~


### Policy precedence

* 아래 얘제는 Namespace 정책보다 Service 지정 정책이 우선되는 예제를 보여줍니다.
  * Namespace 정책에 따라 막혀있던 **non-Istio-service** 에서 **Istio-service** 인 foo Namespace의 "httpbin" 서비스 호출이 가능

~~~
$ cat <<EOF | kubectl apply -n foo -f -
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "overwrite-example"
spec:
  targets:
  - name: httpbin
---
apiVersion: "networking.istio.io/v1alpha3"
kind: "DestinationRule"
metadata:
  name: "overwrite-example"
spec:
  host: httpbin.foo.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
EOF
~~~

* 결과 확인
  * legacy 에서 호출한 foo, bar 의 httpbin 서비스 중 _DestinationRule_ 을 지정한 foo Namespace 의 httpbin 서비스는 호출결과가 `200` (정상)로 전환

~~~
$ ./security-check.sh
~~~

~~~
[foo]
  * foo->foo: 200
  * foo->bar: 200
  * foo->legacy: 200
[bar]
  * bar->foo: 200
  * bar->bar: 200
  * bar->legacy: 200
[legacy]
  * legacy->foo: 200
  * legacy->bar: 000
command terminated with exit code 56
  * legacy->legacy: 200
~~~

### Cleanup

~~~
$ kubectl delete policy default overwrite-example -n foo
$ kubectl delete policy httpbin -n bar
$ kubectl delete dr default overwrite-example -n foo
$ kubectl delete dr httpbin -n bar
~~~


## Origin (End-user) authentication
***

### 준비작업

* foo Namespace의 httpbin 서비스를  ingressgateway 노출

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: httpbin-gateway
  namespace: foo
spec:
  selector:
    istio: ingressgateway # use Istio default gateway implementation
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
  namespace: foo
spec:
  hosts:
  - "*"
  gateways:
  - httpbin-gateway
  http:
  - route:
    - destination:
        port:
          number: 8000
        host: httpbin.foo.svc.cluster.local
EOF
~~~

* 노출된 Istio-ingressgateway 확인 - `200`(정상) 결과 확인

~~~
$ INGRESS_URL=http://$(minikube ip -p istio-security):$(k get svc/istio-ingressgateway -n istio-system -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
$ curl -I $INGRESS_URL
~~~


### Istio-service 에 Policy 적용하고 JWT 인증  처리하는 방법

* "foo" Namespace 에 JWT 인증 처리 _Policy_ 생성

~~~
$ cat <<EOF | kubectl apply -n foo -f -
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "jwt-example"
spec:
  targets:
  - name: httpbin
  origins:
  - jwt:
      issuer: "testing@secure.istio.io"
      jwksUri: "https://raw.githubusercontent.com/istio/istio/release-1.1/security/tools/jwt/samples/jwks.json"
  principalBinding: USE_ORIGIN
EOF
~~~

* 서비스 다시 호출 시 `401`(권한없음)로  변경됨을 확인

~~~
$ curl -I $INGRESS_URL
~~~

* 토큰을 헤더에 지정하여 재요청하면 `200`(정상) 결과 리턴으로 변경됨을 확인

~~~
$ JWT_TOKEN=$(curl https://raw.githubusercontent.com/istio/istio/release-1.1/security/tools/jwt/samples/demo.jwt -s)
$ curl -I  --header "Authorization: Bearer $JWT_TOKEN" $INGRESS_URL
~~~

### Istio-service의 특정 Path에 대해서만 인증에서 제외하는 방법

* /user_agent Path를 제외(`excluded_paths`)하고 인증처리에서 제외하도록 지정

~~~
$ cat <<EOF | kubectl apply -n foo -f -
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "jwt-example"
spec:
  targets:
  - name: httpbin
  origins:
  - jwt:
      issuer: "testing@secure.istio.io"
      jwksUri: "https://raw.githubusercontent.com/istio/istio/release-1.1/security/tools/jwt/samples/jwks.json"
      trigger_rules:
      - excluded_paths:
        - exact: /user-agent
  principalBinding: USE_ORIGIN
EOF
~~~

* 결과 확인
  * /headers : 401
  * /user-agent : 200

~~
$ curl -I http://$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.clusterIP}')/headers
$ curl -I http://$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.clusterIP}')/user-agent
~~

### 특정 Path를 End-user 인증에서 포함

* 아래와 같이 **/ip** Path는  인증처리에서 포함(`included_paths`) 되도록 _Policy_ 를 설정

~~~
$ cat <<EOF | kubectl apply -n foo -f -
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "jwt-example"
spec:
  targets:
  - name: httpbin
  origins:
  - jwt:
      issuer: "testing@secure.istio.io"
      jwksUri: "https://raw.githubusercontent.com/istio/istio/release-1.1/security/tools/jwt/samples/jwks.json"
      trigger_rules:
      - included_paths:
        - exact: /ip
  principalBinding: USE_ORIGIN
EOF
~~~

* 결과 확인
  * /user-agent : 200
  * /ip : 401

~~~
$ curl -I $INGRESS_URL/user-agent
$ curl -I $INGRESS_URL/ip
~~~

* **/ip** 로 Token 정보를 헤더에 같이 보내면 인증 통과하여 `401` 에서  `200` 으로 변경

~~~
$ curl -I --header "Authorization: Bearer $JWT_TOKEN" $INGRESS_URL/ip
~~~

### End-user 인증을  mutual TLS와 함께 사용

* End-user 인증과 and mutual TLS 을 같이 사용 가능


### Cleanup

~~~
$ kubectl delete policy jwt-example -n foo
~~~