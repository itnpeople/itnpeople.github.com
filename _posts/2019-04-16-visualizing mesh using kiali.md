---
title:  "[Istio/task] Visualizing mesh using Kiali"
date:   2019/04/16 14:55
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","install","쿠버네티스","이스티오","minikube","kiali"]
description: "Istio에서 수집된 각종 지표를 기반으로, 서비스간의 관계와 처리량, 정상 여부, 응답 시간등 각종 지표들을 를 시각화해주는 Kiali를 minikube 환경에서 설치해보고 실행해봅니다."
---

# Visualizing Mesh on minikube (Kiali)
---
*docker engine 18.06.2-ce*, *kubernetes 1.13.4*, *Istio 1.1.1*, *minikube v0.35.0* , *macOS Mojave 10.14.4(18E226)*

Istio에서 수집된 각종 지표를 기반으로, 서비스간의 관계와 처리량, 정상 여부, 응답 시간등 각종 지표들을 를 시각화해주는 Kiali를 minikube 환경에서 설치해보고 실행해봅니다.

* [Istio Task 공식문서](https://istio.io/docs/tasks/telemetry/kiali/)
* [Kiali Official Home](https://www.kiali.io/)


## 준비작업
***

* minikube 준비

~~~
$ minikube start --cpus 4 --memory 8192 -p istio-visual-mesh
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

* `iali.enabled=true` 옵션을 지정하여 Kiali 포함하도록 Istio 설치

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system | kubectl apply -f -
~~~

* Istio 파드 정상상태 확인 및 대기

~~~
$ kubectl get pod -n istio-system
~~~


* [BookInfo](https://istio.io/docs/examples/bookinfo/) 어플 설치 및 확인(대기)

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/platform/kube/bookinfo.yaml)
$ kubectl get pod 
~~~


* [minikube tunnel](https://github.com/kubernetes/minikube/blob/master/docs/tunnel.md) 구성

~~~
$ minikube tunnel  -p istio-visual-mesh
$ sudo route -n add 10.0.0.0/8 $(minikube ip -p istio-visual-mesh)
~~~


## Kiali
***

### Kiali 설치

* Secret 생성 - 사용할 계정(아이디 비밀번호)을 base64 인코딩하고 환경변수에 지정

~~~
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
~~~


* `iali.enabled=true` 옵션을 지정하여 Kiali 포함하도록 Istio 재 구성

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set kiali.enabled=true \
| kubectl apply -f -
~~~

* Kiali 파드 Running상태 확인 및 대기

~~~
$ kubectl get pod -n istio-system
~~~


### Kiali 설치 확인

* 브라우저에서 아래 kiali UI에 접속, 계정은 앞서 등록했던 계정 (admin/admin)

~~~
$ echo http://$(kubectl get svc/kiali -n istio-system -o jsonpath={.spec.clusterIP}):20001/kiali/console 
~~~



* 트래픽 발생시키지 않으면 Visualization 한 화면을 확인할 수 없으므로 임의로 트래픽을 발생시킨다.

~~~
$ PROD_URL=http://$(kubectl get svc/productpage -o jsonpath={.spec.clusterIP}):9080/productpage; \
for i in {1..10}; do \
  curl -I $PROD_URL; \
  sleep 1; \
done
~~~

* 트래픽 발생하고 잠시 후 브라우저 결과가 반영된다. 좌측 메뉴 `Graph` 메뉴 참조

* 제사한 내용은 [Kiali 공식문서](https://www.kiali.io/documentation/overview/) 참조