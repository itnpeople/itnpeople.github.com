---
title:  "Istio Sidecar Injection"
date:   2019/05/09 17:05
categories: "cloud"
tags: ["recent"]
keywords: ["istio","kubernetes","install","쿠버네티스","이스티오","minikube","sidecar","sidecar-injection","istio-injection"]
description: "만일 나의 클러스터내에 Istio-system 이 설치가 되었다면 가장 먼저 해야 할 일은  envoy sidecar 를 설치하는 것이다.
sidecar-injection 이란 이렇게 파드에 sidecar를 설치하는 과정으로 3가지 설정 정보에 의해서 결정되며 istio는 수동/자동 2가지 방법을 통해 sidecar-injection 을  수행한다"
---

# Istio Sidecar Injection
---
*docker engine 18.06.2-ce*, *kubernetes 1.14.0*, *Istio 1.1.1*, *minikube v1.0.0* , *macOS Mojave 10.14.4(18E226)*


만일 나의 클러스터내에 Istio-system 이 설치가 되었다면 가장 먼저 해야 할 일은  envoy _sidecar_ 를 설치하는 것이다.
_sidecar-injection_ 이란 이렇게 파드에 sidecar를 설치하는 과정으로 3가지 설정 정보에 의해서 결정되며 istio는 수동/자동 2가지 방법을 통해 _sidecar-injection_ 을  수행한다.


## 시작하기
---

### sidecar-injection 정의

* Istio가 _pod_ 를 관리하기 위해서는 envoy _sidecar_(proxy)가 설치되어야 한다.
* _sidecar-injection_ (이하 _injection_) 이란 Istio 운영을 위해  _pod_ 에  envoy _sidecar_ container를 설치는 과정
* _pod_ 에 _sidecar_ 컨테이너가 포함된다.
* Istio 는 kubernetes **MutatingAdmission Webhooks** 에서  sidecar proxy injection 작업을 수행한다.


### 확인 방법

* kubectl 을 통한 확인
  * 일반 상태에서 _pod_ 를 조회하면 `READY  1/1`  이라면
  * _pod_ 에 _injection_ 되면  `READY  2/2` 로 envoy 컨테이너가 추가로 설치 되는 것을 확인할 수 있다.

~~~
$ kubectl get pod -l app=httpbin

NAME                     READY     STATUS        RESTARTS   AGE
httpbin-776b7bcdcd-7hpnk   1/1       Running       0          4
~~~

~~~
$ kubectl get pod -l app=httpbin

NAME                     READY     STATUS        RESTARTS   AGE
httpbin-776b7bcdcd-bhn9m   2/2       Running       0          7s
~~~

* `docker ps` CLI 를 통한 확인
  * 일반 상태에서 container 를 조회하면 다음과 같이 2개의 컨테이너가 조회 되었다면
  * _pod_ 에 _injection_ 되면 `k8s_istio-proxy_` 라는 Prefix를 가진 컨테이너가 추가 된다.

~~~
$ minikube ssh

# docker ps | grep httpbin | awk '{print $10}'

k8s_httpbin_httpbin-77c6b4bdff-jbwjr_default_05adc80f-a6c7-11e9-a026-0800279747bb_1
k8s_POD_httpbin-77c6b4bdff-jbwjr_default_05adc80f-a6c7-11e9-a026-0800279747bb_1
~~~

~~~
$ minikube ssh

# docker ps | grep httpbin | awk '{print $10}'

k8s_istio-proxy_httpbin-77c6b4bdff-jbwjr_default_05adc80f-a6c7-11e9-a026-0800279747bb_1
k8s_httpbin_httpbin-77c6b4bdff-jbwjr_default_05adc80f-a6c7-11e9-a026-0800279747bb_1
k8s_POD_httpbin-77c6b4bdff-jbwjr_default_05adc80f-a6c7-11e9-a026-0800279747bb_1
~~~

## Sidecar Injection
---

### Injection Rules

3가지 설정항목에 따라 injection 여부 결정하고 처리

* Rule-1. istio-sidecar-injector mutatingwebhookconfiguration의 **namespaceSelector** 매칭 여부

~~~
$ kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml | grep "namespaceSelector:" -A5

  namespaceSelector:
    matchLabels:
      istio-injection: enabled
  rules:
  - apiGroups:
    - ""
~~~

* Rule-2. istio-sidecar-injector configmap **default policy**  (enabled, disabled)

~~~
$ kubectl -n istio-system get configmap istio-sidecar-injector -o jsonpath='{.data.config}' | grep policy:

policy: enabled
~~~

* Rule-3.  pod template spec’s metadata  **sidecar.istio.io/inject** annotation 값 (true, false)

~~~
$ kubectl get deployment httpbin -o yaml | grep "sidecar.istio.io/inject:" -C3

template:
  metadata:
    annotations:
      sidecar.istio.io/inject: "true"
    labels:
      app: httpbin
~~~

* Case별 결과는 [injection status 테이블](https://istio.io/docs/ops/setup/injection/) 참조

* 기타
  * kube-system,kube-public _namespace_ 는 _injection_ 되지 않는다.
  * host network를 사용하는 _pod_ 에는 _injection_ 되지 않는다.


### Injection 방법

* 사용자는  **Manual** 과 **Automatic** 2가지 방법으로 _injection_ 처리
* Manual 방식은 _deployment_ 대상,  Automatic 방식은 _namespace_ 대상
* _Automatic injection_ 이 정상 동작하기 위해서는 istio-system 에 `istio-sidecar-injector` 가  정상 동작하고 있어야 한다.

~~~
$ kubectl get pod -n istio-system | grep istio-sidecar-injector

istio-sidecar-injector-66549495d8-cb6jc   1/1     Running     0          5h12m
~~~

* Manual 방식

`istioctl kube-inject` CLI를 사용

~~~
$ kubectl apply -f <(istioctl kube-inject -f istio-1.2.2/samples/httpbin/httpbin.yaml)

$ istioctl kube-inject -f istio-1.2.2/samples/httpbin/httpbin.yaml | kubectl apply -f -
~~~


* Automatic 방식

_namespace_ 에 `istio-injection=enabled` 라벨링

`istio-injection` 라벨에 `enabled/disabled` 값을 지정하여  _namespace_ 에 _pod_ 가 생성 될 때마다 _injection_ 작업 체크 및 수행

~~~
$ kubectl label namespace default istio-injection=enabled
$ kubectl apply -f istio-1.2.2/samples/httpbin/httpbin.yaml
~~~

## 기타 유의점
---

### _injection_ 은 _pod_ 가 생성될 때 수행된다.

* _injection_ 은 _pod_ 가 생성될 때 수행되므로 배포되어 운영중인 _namespace_ 에 자동 _injection_ 지정을 하더라도  이전 _pod_ 들은 _injection_ 되지 않는다.

* non-injection 상태 구성

~~~
$ kubectl delete -f istio-1.2.2/samples/httpbin/httpbin.yaml
$ kubectl label namespace default istio-injection-
$ kubectl apply -f istio-1.2.2/samples/httpbin/httpbin.yaml

$ kubectl get pod -l app=httpbin
NAME                     READY     STATUS        RESTARTS   AGE
httpbin-776b7bcdcd-7hpnk   1/1       Running       0          4
~~~

* _automatic injection_ 지정 후에도  _injection_되지 않고 변함 없다.

~~~
$ kubectl label namespace default istio-injection=enabled
$ kubectl get pod -l app=httpbin
NAME                     READY     STATUS        RESTARTS   AGE
httpbin-776b7bcdcd-bhn9m   1/1       Running       0          7s
~~~

* _pod_ 삭제하면 신규 생성되면서 _injection_ 되는 것을 확인할 수 있다.

~~~
$ kubectl delete pod -l app=httpbin
$ kubectl get pod -l app=httpbin
NAME                     READY     STATUS        RESTARTS   AGE
httpbin-776b7bcdcd-7hpnk   1/1       Terminating   0          1m
httpbin-776b7bcdcd-bhn9m   2/2       Running       0          7s
~~~

### 자동 _injection_ 은 _pod_ 레벨에서 발생한다.

* 자동 _injection_ 은 _pod_ 레벨에서 발생하게 된다.
* deployment 변경 마다 항상 발생하지 않고 각 _pod_ 개별적으로 체크하고 처리된다.


## 참조

* [sidecar-injection](https://istio.io/docs/setup/kubernetes/additional-setup/sidecar-injection/)
* [Dynamic Admission Webhooks Overview](https://istio.io/docs/ops/setup/webhook/)
* [Sidecar Injection Webhook](https://istio.io/docs/ops/setup/injection/)
* [Demystifying Istio's Sidecar Injection Model](https://istio.io/blog/2019/data-plane-setup/)
