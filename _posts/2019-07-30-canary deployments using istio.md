---
title:  "[Istio] 간단한 시나리오를 통해 Canary 배포 구현해보기"
date:   2019/07/30 09:08
categories: "cloud"
tags: ["recent"]
keywords: ["istio","kubernetes","쿠버네티스", "virtualservice", "destinationrule", "routing"]
description: "Canary 배포는 예전 광산에 유독가스가 있는지 확인하기 위해 카나리아를 광산에 가지고 들어간 것에 아이디어를 얻은 배포 방법으로 Istio 의 virtualservice 와 destinationrule 을 활용하여 비교적 손쉽게(?) 구현 할 수 있습니다. 이 글에서는 간단한 시나리오를 통해 Istio 의  Canary 배포를 어떻게 구현하고 활용할 수 있는지를 확인해봅니다."
---

# 간단한 시나리오를 통해 Canary 배포 구현해보기 - Canary Deployments using Istio
**kubernetes (minikube) 1.14.0*, *Istio 1.2.2*

Canary 배포는 예전 광산에 유독가스가 있는지 확인하기 위해 카나리아를 광산에 가지고 들어간 것에 아이디어를 얻은 배포 방법으로 Istio 의 _virtualservice_ 와 _destinationrule_ 을 활용하여 비교적 손쉽게(?) 구현 할 수 있습니다. 이 글에서는 간단한 시나리오를 통해 Istio 의  Canary 배포를 어떻게 구현하고 활용할 수 있는지를 확인해봅니다.


## 개요

## Canary 배포

카나키아는 메탄, 일산화탄소에 매우 민감하며 가스에 노출되면 죽어버리게 됩니다.
그래서 예전 광산에서는 카나리아가 노래를 계속하고 있는 동안 광부들은 안전함을 느낀 채 일 할 수 있었으며, 카나리아가 죽게 되면 곧바로 탄광을 탈출함으로써 자신의 생명을 보존할 수 있었습니다.

카나리 배포는 이 처럼 광산에 유독가스가 있는지 확인하기 위해 카나리아를 광산에 가지고 들어간 것에 아이디어를 얻은 배포 방법으로 
신규 버전을 배포할 때 기존 버전을 유지한 채로 앱 중 일부만 신규 버전으로 올려서 신규 버전에 버그나 이상은 없는지를 확인합니다.

![Canary](https://blog.christianposta.com/images/canarydeployment.png)

## 준비

* Istio 를 설치합니다. 이때 모니터링을 위해 Kiali를 포함합니다.

~~~
$ kubectl create ns istio-system
$ curl -L https://git.io/getLatestIstio | ISTIO_VERSION=1.2.2 sh -

$ KIALI_USERNAME=$(echo -n 'admin' | base64)
$ KIALI_PASSPHRASE=$(echo -n 'admin' | base64)
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: kiali
  namespace: istio-system
  labels:
    app: kiali
type: Opaque
data:
  username: $KIALI_USERNAME
  passphrase: $KIALI_PASSPHRASE
EOF


$ helm template istio-1.2.2/install/kubernetes/helm/istio --name istio --namespace istio-system \
--set kiali.enabled=true \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~


* httpbin _pod_ 을 배포합니다. honester/httpbin:latest 는 클라이언트 트래픽 발생용 _docker image_ 입니다.

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
  - image: docker.io/honester/httpbin:latest
    imagePullPolicy: IfNotPresent
    name: httpbin
EOF
~~~

* Kiali 를 port-forward 하고 웹브라우저에서 Kiali 콘솔(http://localhost:20001/kiali/console)을 오픈합니다. 

~~~
$ kubectl -n istio-system port-forward svc/kiali 20001
~~~

* Kiali Graph 초기 화면입니다.
  * 사용중인 노드가 없으므로 빈 화면으로 조회됩니다.

![kiali console](http://itnp.kr/resources/img/post/istio-canary-0.png)

* honester/hello-server 는 테스트용 _microservice_ (_docker image_) 입니다.

  * honester/hello-server:v1, honester/hello-server:v2
  * "Hello server - v1", "Hello server - v2" 라는 버전을 display
  * uri가 "/error" 로 요청되면 503 에러를 강제로 발생


### 시나리오

기존에 서비스되고 있는 _microservice_ v1 에서 v2 로 Canary 배포를 수행하고 Kiali를 통해 결과를 모니터링을 합니다. 모니터링 결과에 따라 롤백 및 버전업 처리를 수행합니다.

![istio canary deployments secenario](http://itnp.kr/resources/img/post/istio-canary-demo.png)

* 1단계 : _microservice_ **v1** 배포해 초기상태 구성하기
* 2단계 : _microservice_ **v1** 에 버전정보 라벨링 
* 3단계 : _microservice_ **v2** 배포
* 4단계 : 지정된 일부 사용자를 테스트 영역으로 타켓팅하도록 subset을 구성
  * 조건은 HTTP 프로토콜의  "end-user=testers" 라는 헤더 값을 가진 사용자 대상
* 5단계 : 사용자 모니터링 후 오류 발생을 확인하고 _microservice_ **v1** 로 롤백 처리
  * Kiali를 통해서 타겟팅된 요청을 분석
  * 임의로 fault injection 하고 결과 확인
  * 롤백 처리
* 6 단계 : 사용자 모니터링 후 문제 없음을 확인하여 **v1**에서 **v2**로 전체 라우팅 전환
  * 오류 수정 되었다고 가정하고 _microservice_ **v2**를 재 배포합니다.
  * 모니터링을 통해 문제 없음을 확인하고 _microservice_ **v2**로 Traffic Shifting 합니다.


## 시나리오 실행

### 1단계 : _microservice_  **v1** 배포해 초기상태 구성하기

* 현재 서비스 중이라는 가정하에 _microservice_ v1 를 배포해 시나리오 초기 환경을 구성합니다.
  * label  `app=hello` 로 _pod_ 와 _service_ 연계합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-server-v1
  labels:
    app: hello
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
      - image: honester/hello-server:v1
        imagePullPolicy: IfNotPresent
        name: hello-server-v1
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

*  _microservice_  v1 에  트래픽을 발생시켜 정상적으로 서비스되는지 확인합니다.

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.1; done
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
~~~


* 트래픽 발생 후 Kiali Graph 화면입니다. 트래픽 발생 이후 화면이므로 트래픽 경로만 표시됩니다.

![kiali-canary](http://itnp.kr/resources/img/post/istio-canary-1.png)


### 2단계 : Canary 배포를 처리를 위해 _microservice_ **v1** 에 version=v1 라벨링

* _microservice_ v1은 canary 배포되고 있지 않는 것으로 가정했으므로 추가로 `version=v1` 을 라벨링 합니다.
* 이때 _deployment_ 삭제 후 배포 해야 합니다.
* 다음 단계에서 _microservice_ v2 가 배포될 예정이므로 _service_ 의 `spec.selector` 에 추가로  `version=v1`를 지정하여 _microservice_ v2로 트래픽이 전달되지 않도록 합니다.

~~~
$ kubectl delete deploy hello-server-v1

$ kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-server-v1
  labels:
    app: hello
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello
      version: v1
  template:
    metadata:
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
kind: Service
metadata:
  name: svc-hello
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
EOF
~~~

### 3단계 : _microservice_ **v2** 배포

* _microservice_ v2 를 배포 힙니다.
  * `app=hello, version=v2`

~~~
$ kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-server-v2
  labels:
    app: hello
    version: v2
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello
      version: v2
  template:
    metadata:
      labels:
        app: hello
        version: v2
    spec:
      containers:
      - image: honester/hello-server:v2
        imagePullPolicy: IfNotPresent
        name: hello-server-v2
EOF
~~~

* Kiali Graph 화면 상단 "Display" 메뉴 에서 "Unused Nodes"를 체크하면 _node_ v2 가 조회됩니다.
* 아직 트래픽이 발생되지 않았기 때문에 사용되지 않은 노드(점선)으로 표시됩니다.

![kiali Unused Nodes](http://itnp.kr/resources/img/post/istio-canary-2.png)

* 현재까지 구성 환경은 다음과 같습니다.

~~~
$ kubectl  get all --show-labels

NAME                                   READY   STATUS    RESTARTS   AGE   LABELS
pod/hello-server-v1-77f9f94c77-wt97p   2/2     Running   0          19m   app=hello,pod-template-hash=77f9f94c77,version=v1
pod/hello-server-v1-77f9f94c77-x6v6b   2/2     Running   0          19m   app=hello,pod-template-hash=77f9f94c77,version=v1
pod/hello-server-v2-6c98cd6946-qxrcm   2/2     Running   0          19m   app=hello,pod-template-hash=6c98cd6946,version=v2
pod/hello-server-v2-6c98cd6946-t8txm   2/2     Running   0          7s    app=hello,pod-template-hash=6c98cd6946,version=v2
pod/httpbin                            2/2     Running   0          32m   app=httpbin

NAME                 TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE   LABELS
service/kubernetes   ClusterIP   10.96.0.1        <none>        443/TCP    16d   component=apiserver,provider=kubernetes
service/svc-hello    ClusterIP   10.109.208.234   <none>        8080/TCP   18m   app=hello

NAME                              READY   UP-TO-DATE   AVAILABLE   AGE   LABELS
deployment.apps/hello-server-v1   2/2     2            2           17m   app=hello,version=v1
deployment.apps/hello-server-v2   1/1     1            1           17m   app=hello,version=v2

NAME                                         DESIRED   CURRENT   READY   AGE   LABELS
replicaset.apps/hello-server-v1-77f9f94c77   2         2         2       17m   app=hello,pod-template-hash=77f9f94c77,version=v1
replicaset.apps/hello-server-v2-6c98cd6946   2         2         2       19m   app=hello,pod-template-hash=6c98cd6946,version=v2
~~~


* 트래픽은 여전히 _microservice_ v1 으로 전달됩니다.

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.1; done
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
~~~


### 4단계 : 지정된 일부 사용자를 테스트 영역으로 타켓팅하도록 subset을 구성

* Istio _destinationrule_ 로 subset 구성합니다.
  * Label `version: v1`, `version: v2` 로 **v1**, **v2** 2개의 _subset_ 을 구성합니다.

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
EOF
~~~

* _virtualservice_ 를 생성합니다.
  * 기본 요청은 _subset_ v1 으로 라우팅 됩니다.
  * HTTP 요청 중  "end-user" 라는 헤더 값이 정확히 "testers"인 경우 _subset_ v1:v2 가 50:50 으로 라우팅되도록 합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vs-hello
spec:
  hosts:
    - svc-hello.default.svc.cluster.local
  http:
  - match:
    - headers:
        end-user:
          exact: "testers"
    route:
    - destination:
        host: svc-hello.default.svc.cluster.local
        subset: v1
      weight: 50
    - destination:
        host: svc-hello.default.svc.cluster.local
        subset: v2
      weight: 50
  - route:
    - destination:
        host: svc-hello.default.svc.cluster.local
        subset: v1
EOF
~~~

* _service_ 의  spec.selector `version=v1` 을  제외합니다.
  * 제외하지 않으면 요청 에러가 발생합니다. 
  * _vertualservice_ 는 Kubernetes 의 _service_ 를 세분화하고 추상화한 라우팅 ruleset 입니다. 그렇기 때문에 `version=v1`를 제외하지 않으면 _subset_ v2 는 _service_ 타겟 endpoints 에 포함되지 않아 에러가 발생하는 것입니다.

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

* _service_ `svc-hello` 에 _virtualservice_ 뱃지가 표시됩니다.

![kiali-canary](http://itnp.kr/resources/img/post/istio-canary-3.png)


* 기본 요쳥은 여전히 _microservice_ v1 으로 전달됩니다.

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl  http://svc-hello.default.svc.cluster.local:8080; sleep 0.1; done
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
Hello server - v1
~~~

* 트래픽이 _microservice_ v1 으로 전달되었으므로 푸른색으로 트래픽 경로가 표시됩니다.

![kiali traffic to v1](http://itnp.kr/resources/img/post/istio-canary-4.png)


* 그러나 HTTP 요청 헤더에 "end-user:testers" 를 포함하면 50% 비율로 _microservice_ v2 로 트래픽이 전달되는 것을 확인할 수 있습니다.

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl -H "end-user:testers" http://svc-hello.default.svc.cluster.local:8080; sleep 0.1; done
Hello server - v1
Hello server - v2
Hello server - v2
Hello server - v2
Hello server - v1
~~~

*  _microservice_ v2 로도 트래픽이 발생했으므로 추가로 v2로도 푸른색으로 트래픽 경로가 표시되는 것을 확인 할 수 있습니다.

![![kiali traffic to v2](http://itnp.kr/resources/img/post/istio-canary-5.png)



### 5단계 : 사용자 모니터링 후 오류 발생을 확인하고 _microservice_ **v1** 로 롤백 처리

* v2 에 대한 사용자 테스트 중 오류가 발생했다고 가정하고 다음과 같이 임의로 에러를 발생시키면 Kiali를 통해 오류가 모니터링 됩니다. 

~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl -H "end-user:testers" http://svc-hello.default.svc.cluster.local:8080/error; sleep 0.1; done
Hello server - v2 (uri=/error)
Hello server - v1 (uri=/error)
Hello server - v1 (uri=/error)
Hello server - v2 (uri=/error)
Hello server - v1 (uri=/error)
~~~

* 에러가 발생 했으므로 붉은색으로 트래픽 경로가 표시됩니다.
  * 데모 시나리오 진행 상 v1, v2 모두 붉은색 에러가 발생했지만 실제로는 v2 만 에러가 발생하게 됩니다.

![kiali error](http://itnp.kr/resources/img/post/istio-canary-6.png)


* 전체 트래픽을 _subset_ v1 으로 롤백합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vs-hello
spec:
  hosts:
    - svc-hello.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: svc-hello.default.svc.cluster.local
        subset: v1
EOF
~~~


### 6 단계 : 사용자 모니터링 후 문제 없음을 확인하여 **v1**에서 **v2**로 전체 라우팅 전환

* 오류 수정 후 문제 없다면 버전업 선택하고 전체 트래픽을  _subset_ v2로 전환합니다.

~~~
$ kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vs-hello
spec:
  hosts:
    - svc-hello.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: svc-hello.default.svc.cluster.local
        subset: v2
EOF
~~~


~~~
$ for i in {1..5}; do kubectl exec -it httpbin -c httpbin -- curl http://svc-hello.default.svc.cluster.local:8080; sleep 0.1; done
Hello server - v2
Hello server - v2
Hello server - v2
Hello server - v2
Hello server - v2
~~~

* _deployment_ v1을 삭제합니다.

~~~
$ kubectl delete deploy hello-server-v1
~~~

* 아래와 같이 v2 로 트래픽이 전환되었습니다.

![kiali traffic shift](http://itnp.kr/resources/img/post/istio-canary-7.png)


### clean-up

~~~
$ kubectl delete deploy/hello-server-v1 deploy/hello-server-v2 service/svc-hello vs/vs-hello dr/dr-hello  po/httpbin
~~~

## Conclusion

Istio 의 _virtualservice_ , _destinationrule_ 의  traffic shifting 기능을 활용하여 Canary Deployment 를 간단한 시나리오로 구현해 볼 수 있었습니다. 이를 조금만 더 응용한다면 Blug/Green, A/B Test 역시도 유사한 방식으로 구현 가능하리라 판단됩니다.
물론 production-level 에서는 이보다는 헐씬 더 복잡하고 다양한 경우가 발생할 것입니다. 뿐만 아니라 운영관점에서 [Horizontal Pod Autoscaler Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/) 등도 추가로 고려해야 할 것입니다.


## 참고

* [Canary Deployments using Istio](https://istio.io/blog/2017/0.1-canary/)
* [Flagger:progressive delivery Kubernetes operator](https://docs.flagger.app/how-it-works)
* [Official-Destination Rule](https://istio.io/docs/reference/config/networking/v1alpha3/destination-rule)
* [Official-Virtual Service](https://istio.io/docs/reference/config/networking/v1alpha3/virtual-service/)


## 기타

### Blue/Green vs Canary vs A/B Testing

* [Blue-green Deployments, A/B Testing, and Canary Releases](https://blog.christianposta.com/deploy/blue-green-deployments-a-b-testing-and-canary-releases/)
* 다음과 같이 Blue/Green, Canary, A/B Testing 차이점을 이해합니다.


* Canary

![Canary](https://i.stack.imgur.com/bA9Xi.png)


* Blue/Green
![Blue/Green](https://i.stack.imgur.com/RtQRg.png)


* A/B Testing

![A/B Testing](https://blog.christianposta.com/images/abtesting.png)

