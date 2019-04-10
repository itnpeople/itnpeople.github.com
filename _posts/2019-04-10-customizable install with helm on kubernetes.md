---
title:  "Kubernetes에 Istio Control Plane을 Helm template 으로 설치하는 방법"
date:   2019/04/10 15:05
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","install","쿠버네티스","이스티오", "Helm"]
description: "Kubernetes에 Istio Control Plane을 Helm template 으로 설치하는 방법"
---

# Kubernetes에 Istio Control Plane을 Helm template 으로 설치하는 방법
문서 : https://istio.io/docs/setup/kubernetes/install/helm/


## 준비작업

1. Helm 초기화 
~~~
$ helm init
~~~
* helm 클라이언트가 설치되었다는 전제

1. Istio 다운로드 및 압축해제
~~~
$ wget https://github.com/istio/istio/releases/download/1.1.1/istio-1.1.1-osx.tar.gz
$ tar -vxzf istio-1.1.1-osx.tar.gz
$ cd istio-1.1.1
~~~

1. 네임스페이스 생성
~~~
$ kubectl create namespace istio-system
~~~

1. CRDs 등록
* kubectl apply 에 사용할 Istio Custom Resource Definitions (CRDs) 을 등록해준다. 잠시후 Kubernetes APi Server 에 반영된댜.
~~~
$ helm template install/kubernetes/helm/istio-init --name istio-init --namespace istio-system | kubectl apply -f -
$ kubectl get crds | grep 'istio.io'
~~~


## default 설치
~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system | kubectl apply -f -
~~~

## 옵션을 지정하여 설치

* 설치옵션이 저정된 Custom yaml을 지정하여 설치하는 방법 
~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--values install/kubernetes/helm/istio/values-istio-minimal.yaml \
| kubectl apply -f -
~~~

* 설치옵션을 직접 지정하는 방법 
~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~

* [세부 설치옵션](https://istio.io/docs/reference/config/installation-options/) 참조

* minikube에 설치 처럼 LoadBalancer 를 활용할 수 없는 환경에서는 LoadBalancer 대신 NodePort 를 사용


## Template을 이용한 업데이트
`install/kubernetes/helm/istio/charts/gateways/templates/service.yaml` 에 `gateways.istio-ingressgateway.type` 옵션을 변경하여 수정 적용하는 예제
~~~
helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
-x charts/gateways/templates/service.yaml \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~

## Uninstall

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system | kubectl delete -f -
$ kubectl delete namespace istio-system
~~~
