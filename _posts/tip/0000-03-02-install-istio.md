---
title:  Istio Installation
date:   2022/03/18 9:42
categories: "tip"
tags: ["kubernetes","istio"]
keywords: ["kubernetes","istio"]
description: Development Tips - Istio Installation
---

# {{ page.title }}

**Table of Contents**

* [1.7.3](#173)
* [1.2.4](#124)
* [Values](#values)

## 1.7.3
> Install with Istioctl

* Addons :Promethus, Kiali
* https://istio.io/v1.7/docs/setup/install/istioctl/
* Ingress-gateway를 `NodePort:32080 ` 로 오픈하고 Kiali와 연동


### Download

```
▒ curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.7.3 TARGET_ARCH=x86_64 sh -
▒ cd istio-1.7.3
▒ chmod +x bin/istioctl
▒ cp bin/istioctl /usr/local/bin
```

### Install
> override 설치 예

* 아래와 같이 default profile 에서 수정할 ingressGateways 스펙을 조회 (해당 스펙 참조)

```
▒ istioctl profile dump default --config-path components.ingressGateways
▒ istioctl profile dump default --config-path values.gateways.istio-ingressgateway
```

* install - Ingress-gateway 를 NodePort (32080)로  override 설치

```
▒ istioctl install --set profile=default -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - enabled: true
      k8s:
        service:
          ports:
          - name: status-port
            port: 15021
            targetPort: 15021
          - name: http2
            port: 80
            targetPort: 8080
            nodePort: 32080
          - name: https
            port: 443
            targetPort: 8443
            nodePort: 32443
          - name: tls
            port: 15443
            targetPort: 15443
      name: istio-ingressgateway
  values:
    gateways:
      istio-ingressgateway:
        type: NodePort
EOF
```


### Install Addons : Promethus & Kiali
* https://kiali.io/documentation/latest/quick-start/

* Install Promethus & Kiali 

```
▒ kubectl apply -n istio-system -f samples/addons/prometheus.yaml
▒ kubectl apply -n istio-system -f samples/addons/kiali.yaml
```

* Expose Kiali UI

```
▒ kubectl apply -n istio-system -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: default-gateway
spec:
  selector:
    istio: ingressgateway
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
  name: kiali
spec:
  hosts:
  - "*"
  gateways:
  - default-gateway
  http:
  - match:
    - uri:
        prefix: /kiali
    route:
    - destination:
        port:
          number: 20001
        host: kiali
EOF
```



## 1.2.4

* 다운로드 +  네임스페이스 생성

~~~
▒ cd install/istio/
▒ curl -L https://git.io/getLatestIstio | ISTIO_VERSION=1.2.4 sh -
▒ kubectl create ns istio-system
~~~

* CRDs 생성

~~~
▒ helm template istio-1.2.4/install/kubernetes/helm/istio-init --name istio-init --namespace istio-system | kubectl apply -f -
~~~

* 설치

~~~
▒ helm template istio-1.2.4/install/kubernetes/helm/istio --name istio --namespace istio-system \
--set gateways.istio-ingressgateway.type=NodePort \
| kubectl apply -f -
~~~


## Values

* Kiali 함께 설치
  * `--set kiali.enabled=true` 

* 프로메테우스 신규 설치 하지 않고 다른 프로메테우스 사용
  * `--set prometheus.enabled=false`
  * `--set prometheusAddr=http://prometheus.cocktail-addon.svc.cluster.local:80`



### external 프로메테우스 사용시
> 기존 운영중인 프로메테우스에서 istio metrics 수집 처리하도록 configmap 수정 작업

* 아래와 같이 configmap 에 `istio-mesh`, `istio-telemetry` job 추가

~~~
▒ kubectl edit configmap prometheus -n cocktail-addon

    - job_name: 'istio-mesh'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - istio-system
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: istio-telemetry;prometheus

    - job_name: 'istio-telemetry'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - istio-system
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: istio-telemetry;http-monitoring
~~~