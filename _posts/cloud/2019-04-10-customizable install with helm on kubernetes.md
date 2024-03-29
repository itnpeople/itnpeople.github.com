---
title:  "Kubernetes에 Istio Control Plane을 Helm template 으로 설치하는 방법"
date:   2019/04/10 15:05
categories: "cloud"
tags: ["cloud", "istio","kubernetes", "helm"]
keywords: ["istio", "Helm","kubernetes","install","쿠버네티스","이스티오"]
description: "Kubernetes에 Istio Control Plane를 설치 하는 방법 중에서 Helm template을 활용하여 설치하는 방법을 수행해 봅니다."
---

# Kubernetes에 Istio Control Plane을 Helm template 으로 설치하는 방법
*docker engine 18.06.2-ce*, *kubernetes 1.13.4*, *Istio 1.1.1*, *minikube v0.35.0* , *macOS Mojave 10.14.4(18E226)*

Kubernetes에 Istio Control Plane를 설치 하는 방법 중에서 Helm template을 활용하여 설치하는 방법을 수행해 봅니다.

* [공식문서](https://istio.io/docs/setup/kubernetes/install/helm/) 참조


## 공통 준비작업
***

* 클러스터 준비 (minikube)

~~~
$ minikube delete
$ minikube start --cpus 4 --memory 8192
~~~


* Helm 설치 및 초기화

~~~
$ brew install kubernetes-helm
$ helm init
~~~


* Istio 다운로드 및 압축해제

~~~
$ wget https://github.com/istio/istio/releases/download/1.1.1/istio-1.1.1-osx.tar.gz
$ tar -vxzf istio-1.1.1-osx.tar.gz
$ cd istio-1.1.1
~~~

* 네임스페이스 생성

~~~
$ kubectl create namespace istio-system
~~~

* CRDs 등록
* kubectl apply 에 사용할 Istio Custom Resource Definitions (CRDs) 을 등록해준다. 잠시후 Kubernetes APi Server 에 반영

~~~
$ helm template install/kubernetes/helm/istio-init --name istio-init --namespace istio-system | kubectl apply -f -
$ kubectl get crds | grep 'istio.io'
~~~

## Case 별 구성 방법
***

### #1. Default 구성

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system | kubectl apply -f -
~~~

### #2. 설치옵션이 저정된 Custom yaml을 지정하여 구성

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--values install/kubernetes/helm/istio/values-istio-minimal.yaml \
| kubectl apply -f -
~~~

* [Profile(values  yaml)별 설치 첨포넌트] (https://istio.io/docs/setup/kubernetes/additional-setup/config-profiles/) 참조


### #3. 설치옵션을 직접 지정하여 구성

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~

* [세부 설치옵션](https://istio.io/docs/reference/config/installation-options/) 참조

* Istio의 ingressgateway는 기본적으로  LoadBalancer 로 설치된다. 이때 minikube에 설치 처럼 LoadBalancer 를 활용할 수 없는 환경에서는 LoadBalancer 대신 NodePort 를 사용하도록 합니다.


### #4. Template을 이용한 구성
`install/kubernetes/helm/istio/charts/gateways/templates/service.yaml` 에 `gateways.istio-ingressgateway.type` 옵션을 변경하여 override하여 적용하는 예제

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
-x charts/gateways/templates/service.yaml \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~

## Uninstall
***

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system | kubectl delete -f -
$ kubectl delete namespace istio-system
~~~

