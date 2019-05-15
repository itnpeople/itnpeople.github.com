---
title:  "[Istio] Automatic sidecar injection과 사용중인 파드와의 관계"
date:   2019/05/09 17:05
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","install","쿠버네티스","이스티오","minikube","sidecar","sidecar-injection","istio-injection"]
description: "만일 나의 클러스터내에 Istio-system 이 설치가 되었다면 가장 먼저 해야 할 일은  envoy sidecar를 설치하는 것이다. sidecar-injection이란 이렇게 파드에 sidecar를 설치하는 과정으로 공식문서를 통해 그 방법이 기술되어 있다. 하지만 이미 설치되어 있는 파드들은 어떻게 injection 할 수 있는지에 대한 사항이 자세히 언급되어 있지 않아 이를 확인해보고자 한다."
---

# Automatic sidecar injection과 사용중인 파드와의 관계

만일 나의 클러스터내에 Istio-system 이 설치가 되었다면 가장 먼저 해야 할 일은  envoy _sidecar_ 를 설치하는 것이다.
_sidecar-injection_ 이란 이렇게 파드에 sidecar를 설치하는 과정으로 공식문서를 통해 그 방법이 기술되어 있다.
하지만 이미 설치되어 있는 파드들은 어떻게 _injection_ 할 수 있는지에 대한 사항이 자세히 언급되어 있지 않아 이를 확인해보고자 한다.


## sidecar-injection

* Istio 에서  envoy _sidecar_ 를 파드에 설치는 것
* Istio가 파드를 관리하기 위해서는 envoy _sidecar_(proxy)가 설치되어야 한다.
* 이렇게 파드에 _sidecar_ 를 설치하는 과정을 _sidecar-injection_ (이하 _injection_) 라고하며 내부적으로는 파드별로 _sidecar_ 컨테이너가 추가로 포함되어 배포된다.

## _sidecar-injection_ 확인 방법

* 클러스터 호스트(minikube 인 경우는 VM) 에 일반적으로 Kubernetes로 배포된 파드는 _docker ps_  명령으로 확인해보면 _POD컨테이너_ 와 함께 n개의 사용자 컨테이너들(최소 2개이상 컨테이너들)이 존재함을 확인할 수 있다.
* 아래는 Istio 튜토리얼에 포함되어 있는 _httpbin 서비스 예제_ 로 httpbin 파드에 2개의 컨테이너가 배포된 것을 확인할 수 있다.

~~~
$ minikube ssh
$ docker ps | grep httpbin
~~~

~~~
k8s_httpbin_httpbin-*
k8s_POD_httpbin-*
~~~

* 만일 이 파드에 _sidecar_ 를 설치되었다면 `k8s_istio-proxy_` 라는 Prefix를 가진 컨테이너가 추가로 배포 된다.
* 아래 예제를 통해 _injection_ 된 httpbin 파드는 총 3개의 컨테이너가 배포되었음을 확인할 수 있다.

~~~
$ minikube ssh
$ docker ps | grep httpbin
~~~

~~~
k8s_istio-proxy_httpbin-*
k8s_httpbin_httpbin-*
k8s_POD_httpbin-*
~~~

## _sidecar-injection_ 방법

[공식문서- sidecar-injection](https://istio.io/docs/setup/kubernetes/additional-setup/sidecar-injection/) 에서 _injection_ 처리를 위해서는 다음과 같은 2가지 방법을 제시하고 있다.

### 1. Automatic

* 네임스페이스별로 _istio-injection_  라벨링을 해주면  파드별로 _injection_ 을 지정해 주지 않아도  해당 네임스페이스에 파드가 배포될 때마다 자동으로 _injection_ 된다.

~~~
$ kubectl label namespace default istio-injection=enabled
~~~

* 이때 자동 _injection_ 이 정상 동작하기 위해서는 istio-system 에 `istio-sidecar-injector` 가  정상 동작하고 있어야 한다.

~~~
$ kubectl get pod -n istio-system | grep istio-sidecar-injector
~~~


### 2. Manual

파드별 _injection_ 처리 


## Automatic _sidecar-injection_ 대상은 네임스페이스 단위

* 앞서  자동으로 _injection_ 하는 방법은 `istio-injection=enabled` 라벨링이라고 확인하였다 그렇다면 네임스페이스가 아닌 파드에 `istio-injection=enabled` 라벨링을 하면 해당 파트가 자동으로 _injection_ 이 될까?
* 아래 진행 예제와 같이 파드에 라벨링을 하면 _injection_ 이 되지 않는다
* 즉 자동 _injection_ 대상은  파드 단위가 아니라 네임스페이스 단위임을 확인할 수 있다.

~~~
$ kubectl label pod $(kubectl get pods | grep httpbin | awk '{print $1}') istio-injection=enabled
$ minikube ssh
$ docker ps | grep httpbin
~~~

~~~
k8s_httpbin_httpbin-*
k8s_POD_httpbin-*
~~~


## 이미 배포/운영 중인 파드들에 Automatic _sidecar-injection_ 처리를 한다면 

* 이미 파드가 배포되어 운영중인 네임스페이스에 자동으로 _injection_ 되도록 설정한 상태라면 해당 네임스페이스 내의 파드들은 자동으로 _injection_ 될까?
* __injection되지 않는다__
* 아래 과정을 통해 이를 확인 할 수 있다.
  1. 이전 설치되었던 httpbin 과 'istio-injection=enabled' 라벨을 삭제한 후 
  1. 2개 컨네이터만 배포된것을 확인하고
  1. `istio-injection=enabled` 라벨링 해도
  1. 변동없이 2개 컨테이너만  조회되는 것을 확인

~~~
$ kubectl delete -f samples/httpbin/httpbin.yaml
$ kubectl label namespace default istio-injection-
$ kubectl apply -f samples/httpbin/httpbin.yaml

minikube ssh
docker ps | grep httpbin
~~~

~~~
k8s_httpbin_httpbin-*
k8s_POD_httpbin-*
~~~

~~~
k label namespace default istio-injection=enabled
~~~

~~~
docker ps | grep httpbin
~~~


~~~
k8s_httpbin_httpbin-*
k8s_POD_httpbin-*
~~~


## 결론

### 이전에 배포되었던 _non-sidecar-injection_ 파드들은 _automatic sidecar-injection_ 상태라도 재배포 되어야만 _injection_ 처리 된다.

* 자동으로 _injection_ 설정된 네임스페이스라도 이전에 설치된 파드들은 __재배포__ 해야만 _sidecar_ 컨테이너가 함께 배포되어 _injection_ 된다.

~~~
$ kubectl label namespace default istio-injection=enabled
$ kubectl apply -f samples/httpbin/httpbin.yaml
$ minikube ssh
$ docker ps | grep httpbin
~~~

~~~
k8s_istio-proxy_httpbin-*
k8s_httpbin_httpbin-*
k8s_POD_httpbin-*
~~~
