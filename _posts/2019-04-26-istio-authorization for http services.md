---
title:  "[Istio/task] Istio Authorization for HTTP Services"
date:   2019/04/26 14:20
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","install","쿠버네티스","이스티오","minikube","authorization"]
description: "Istio는  ClusterRbacConfig 를 통해 접근제어를 활성화하고 ServiceRole에 서비스 접근권한 그룹을 정의하고 ServiceRoleBinding을 통해 사용자, 그룹 또는 서비스에 Role을 지정하여 줍니다."
---

# Authorization for HTTP Services
---
*docker engine 18.06.2-ce*, *kubernetes 1.14.0*, *Istio 1.1.1*, *minikube v1.0.0* , *macOS Mojave 10.14.4(18E226)*

Istio는  ClusterRbacConfig 를 통해 접근제어를 활성화하고 ServiceRole에 서비스 접근권한 그룹을 정의하고 ServiceRoleBinding을 통해 사용자, 그룹 또는 서비스에 Role을 지정하여 줍니다.


## 준비작업

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

* Istio ingresgateway는 노드 포트로 설치

--set global.mtls.enabled=true \


~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~

* Istio 파드 정상상태 확인 및 대기

~~~
$ kubectl get pod -n istio-system
~~~

* bookinfo 설치

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/platform/kube/bookinfo.yaml)
$ kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
$ kubectl apply -f samples/bookinfo/networking/destination-rule-all.yaml
~~~

* /productpage 정상 동작여부 확인 
~~~
$ INGRESS_URL=http://$(minikube ip -p istio-security):$(k get svc/istio-ingressgateway -n istio-system -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')/productpage
$ curl -I $INGRESS_URL
~~~


* _productpage_ 서비스와 _reviews_ 서비스를 위한 `ServiceAccount` 생성

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/platform/kube/bookinfo-add-serviceaccount.yaml)
~~~

* 브라우저에서 _/productpage_ URL을 열여보기

~~~
echo $INGRESS_URL
~~~



## Istio authorization 활성화

* **ClusterRbacConfig** 를 구성하여 Istion authorization 을 활성화 할 수 있다.
* _ClusterRbacConfig_ 모드
  * OFF: 비활성화
  * ON: 활성화
  * ON_WITH_INCLUSION: 지정된 서비스 및 네임스페이스에 대해서만 활성화
  * ON_WITH_EXCLUSION: 지정된 서비스 및 네임스페이스를 제외한 모든 서비스 활성화

~~~
$ kubectl apply -f - <<EOF
apiVersion: "rbac.istio.io/v1alpha1"
kind: ClusterRbacConfig
metadata:
  name: default
spec:
  mode: 'ON_WITH_INCLUSION'
  inclusion:
    namespaces: ["default"]
EOF
~~~    

* authorization 서비스를 지정하지 않았으므로 _/productpage_ 페이지 요청하면 "RBAC: access denied" 결과가 리턴된다.

~~~
$ curl $INGRESS_URL
~~~

~~~
RBAC: access denied
~~~


## Namespace-level 젭근 제어

* Namespace 레벨에서 접근통제 정의한다.
* 공식문서 상에서는 ServiceRoleBinding subjects 에 `source.namespace :"default"` 를 지정하였으나 정상적으로 동작하지 않았음

~~~
$ kubectl apply -f - <<EOF
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRole
metadata:
  name: my-role
  namespace: default
spec:
  rules:
  - services: ["*"]
    methods: ["GET"]
    constraints:
    - key: "destination.labels[app]"
      values: ["productpage", "details", "reviews", "ratings"]
---
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: my-role-binding
  namespace: default
spec:
  subjects:
    - user: "*"
  roleRef:
    kind: ServiceRole
    name: "my-role"
EOF
~~~

* 결과 확인
  * 반영까지 대기한 후 아래 URL을 브라우저에서 열고 반복적으로 refresh 
  * "RBAC: access denied" 에서 정상적인 화면으로 전환됨을 확인한다.

~~~
$ echo $INGRESS_URL
~~~

###  cleanup

~~~
$ kubectl delete ServiceRole --all
$ kubectl delete ServiceRoleBinding --all
~~~

## Service-level 접근통제

### #1.  productpage 서비스 접근 허용

* 위에서 cleanup 처리했으므로 브라우저는 "RBAC: access denied" 로 전환된 상태

~~~
$ echo $INGRESS_URL
~~~

* ServiceRole 에서 특정 서비스(productpage.default.svc.cluster.local)의 GET 메소드에 대한 Role을 부여

~~~
$ kubectl apply -f - <<EOF
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRole
metadata:
  name: my-role
  namespace: default
spec:
  rules:
  - services: ["productpage.default.svc.cluster.local"]
    methods: ["GET"]
---
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: my-role-binding
  namespace: default
spec:
  subjects:
  - user: "*"
  roleRef:
    kind: ServiceRole
    name: "my-role"
EOF
~~~

* 결과 확인
  * 반영까지 대기한 후 브라우져에서 refresh 
  * /productpage 만 정상적인 조회되고 Detail 과 Review 부분은 에러가 발생한다.

~~~
$ echo $INGRESS_URL
~~~


### #2. details & reviews 서비스 접근 허용

* 추가로 _details_ 과 _reviews_ 서비스에 Role을 부여하여 접근가능하도록 한다.
* 공식문서 상에서는 ServiceRoleBinding subjects에 `user:"cluster.local/ns/default/sa/bookinfo-productpage"` 를 지정하였으나 정상적으로 동작하지 않았음

~~~
$ kubectl apply -f - <<EOF
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRole
metadata:
  name: details-reviews-viewer
  namespace: default
spec:
  rules:
  - services: ["details.default.svc.cluster.local", "reviews.default.svc.cluster.local"]
    methods: ["GET"]
---
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: bind-details-reviews
  namespace: default
spec:
  subjects:
  - user: "*"
  roleRef:
    kind: ServiceRole
    name: "details-reviews-viewer"
EOF
~~~

* 결과 확인
  * 반영까지 대기한 후 브라우져에서 refresh 
  * review 부분이 정상으로 조회된다.
  * 여전히 ratings 부분은 오류를 발생시킨다.

~~~
$ echo $INGRESS_URL
~~~


### #3. ratings 서비스 접근 허용

* 추가로 _ratings_ 서비스에 Role을 부여하여 접근가능하도록 한다.
* 공식문서 상에서는 ServiceRoleBinding subjects에 `user:"cluster.local/ns/default/sa/bookinfo-reviews"` 를 지정하였으나 정상적으로 동작하지 않았음

~~~
$ kubectl apply -f - <<EOF
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRole
metadata:
  name: ratings-viewer
  namespace: default
spec:
  rules:
  - services: ["ratings.default.svc.cluster.local"]
    methods: ["GET"]
---
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: bind-ratings
  namespace: default
spec:
  subjects:
  - user: "*"
  roleRef:
    kind: ServiceRole
    name: "ratings-viewer"
EOF
~~~

* 결과 확인
  * 반영까지 대기한 후 브라우져에서 refresh 
  * review 부분의 ratings 값이 정상으로 조회된다.

~~~
$ echo $INGRESS_URL
~~~

### cleanup

~~~
$ kubectl delete servicerole --all
$ kubectl delete servicerolebinding --all
$ kubectl delete  clusterrbacconfig --all
~~~
