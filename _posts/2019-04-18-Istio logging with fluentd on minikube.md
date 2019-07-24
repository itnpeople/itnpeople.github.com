---
title:  "Istio 연습과제 - Logging with Fluentd on minikube"
date:   2019/04/18 13:15
categories: "cloud"
tags: []
keywords: ["istio","fluentd","elasticsearch","kibana","kubernetes","install","쿠버네티스","이스티오","minikube"]
description: "Fluentd +  Elasticsearch + Kibana Stack 을 구성해보고 Istio에서 telemetry metric, 수집하는 handler,  metric 과 handler를 연결하는 rule 정의를 통하여 telemetry 데이터를 elasticsearch 로 수집하고 수집된 데이터를 kibana를 통해 조회해 봅니다."
---

# Istio 연습과제 - Logging with Fluentd on minikube
---
*docker engine 18.06.2-ce*, *kubernetes 1.14.0*, *Istio 1.1.1*, *minikube v1.0.0* , *macOS Mojave 10.14.4(18E226)*

Fluentd +  Elasticsearch + Kibana Stack (EFK) 을 구성해보고 Istio에서 telemetry metric, 수집하는 handler,  metric 과 handler를 연결하는 rule 정의를 통하여 telemetry 데이터를 elasticsearch 로 수집하고 수집된 데이터를 kibana를 통해 조회해 봅니다.

## 준비작업
***
* minikube 준비

~~~
$ minikube start --cpus 4 --memory 8192 -p istio-fluentd
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

* `configDefaultNamespace=istio-system` 옵션 지정하여 Istio 설치

~~~
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system \
--set configDefaultNamespace=istio-system \
| kubectl apply -f -
~~~

* Istio 파드 정상상태 확인 및 대기

~~~
$ kubectl get pod -n istio-system
~~~

* Istio-system 파드 정상상태로 설치되었다면  [BookInfo](https://istio.io/docs/examples/bookinfo/) 어플 설치 및 확인

~~~
$ kubectl apply -f <(istioctl kube-inject -f samples/bookinfo/platform/kube/bookinfo.yaml)
$ kubectl get pod
~~~


* _Istio ingress gateway_  환경변수 `GW_URL` 정의

~~~
$ export GW_URL=http://$(minikube ip -p istio-fluentd):$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
~~~



## Logging with Fluentd
***
이 TASK는  Fluentd / Elasticsearch / Kibana stack을 활용한 로그처리 예제를 보여준다.

* Fluentd, Elasticsearch, Kibana Stack 적용

~~~
$ kubectl create namespace logging
~~~

* Elasticsearch 생성

~~~
$ kubectl apply -f - <<EOF 
# Elasticsearch Service
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: logging
  labels:
    app: elasticsearch
spec:
  ports:
  - port: 9200
    protocol: TCP
    targetPort: db
  selector:
    app: elasticsearch
---
# Elasticsearch Deployment
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: elasticsearch
  namespace: logging
  labels:
    app: elasticsearch
  annotations:
    sidecar.istio.io/inject: "false"
spec:
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - image: docker.elastic.co/elasticsearch/elasticsearch-oss:6.1.1
        name: elasticsearch
        resources:
          # need more cpu upon initialization, therefore burstable class
          limits:
            cpu: 1000m
          requests:
            cpu: 100m
        env:
          - name: discovery.type
            value: single-node
        ports:
        - containerPort: 9200
          name: db
          protocol: TCP
        - containerPort: 9300
          name: transport
          protocol: TCP
        volumeMounts:
        - name: elasticsearch
          mountPath: /data
      volumes:
      - name: elasticsearch
        emptyDir: {}
EOF
~~~

* Fluentd 설치

~~~
$ kubectl apply -f - <<EOF 
# Fluentd Service
apiVersion: v1
kind: Service
metadata:
  name: fluentd-es
  namespace: logging
  labels:
    app: fluentd-es
spec:
  ports:
  - name: fluentd-tcp
    port: 24224
    protocol: TCP
    targetPort: 24224
  - name: fluentd-udp
    port: 24224
    protocol: UDP
    targetPort: 24224
  selector:
    app: fluentd-es
---
# Fluentd Deployment
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: fluentd-es
  namespace: logging
  labels:
    app: fluentd-es
  annotations:
    sidecar.istio.io/inject: "false"
spec:
  template:
    metadata:
      labels:
        app: fluentd-es
    spec:
      containers:
      - name: fluentd-es
        image: gcr.io/google-containers/fluentd-elasticsearch:v2.0.1
        env:
        - name: FLUENTD_ARGS
          value: --no-supervisor -q
        resources:
          limits:
            memory: 500Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: config-volume
          mountPath: /etc/fluent/config.d
      terminationGracePeriodSeconds: 30
      volumes:
      - name: config-volume
        configMap:
          name: fluentd-es-config
---
# Fluentd ConfigMap, contains config files.
kind: ConfigMap
apiVersion: v1
data:
  forward.input.conf: |-
    <source>
      type forward
    </source>
  output.conf: |-
    <match **>
       type elasticsearch
       log_level info
       include_tag_key true
       host elasticsearch
       port 9200
       logstash_format true
       buffer_chunk_limit 2M
       buffer_queue_limit 8
       flush_interval 5s
       max_retry_wait 30
       disable_retry_limit
       num_threads 2
    </match>
metadata:
  name: fluentd-es-config
  namespace: logging
EOF
~~~

* Kibana 설치

~~~
$ kubectl apply -f - <<EOF 
# Kibana Service
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: logging
  labels:
    app: kibana
spec:
  ports:
  - port: 5601
    protocol: TCP
    targetPort: ui
  selector:
    app: kibana
---
# Kibana Deployment
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: kibana
  namespace: logging
  labels:
    app: kibana
  annotations:
    sidecar.istio.io/inject: "false"
spec:
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
      - name: kibana
        image: docker.elastic.co/kibana/kibana-oss:6.1.1
        resources:
          # need more cpu upon initialization, therefore burstable class
          limits:
            cpu: 1000m
          requests:
            cpu: 100m
        env:
          - name: ELASTICSEARCH_URL
            value: http://elasticsearch:9200
        ports:
        - containerPort: 5601
          name: ui
          protocol: TCP
EOF
~~~

* 정상동작 확인

~~~
$ kubectl get pod -n logging
~~~


*  log __instance__, __handler__, __rule__  Istio에 적용

~~~
$ kubectl apply -f - <<EOF
apiVersion: "config.istio.io/v1alpha2"
kind: logentry
metadata:
  name: newlog
  namespace: istio-system
spec:
  severity: '"info"'
  timestamp: request.time
  variables:
    source: source.labels["app"] | source.workload.name | "unknown"
    user: source.user | "unknown"
    destination: destination.labels["app"] | destination.workload.name | "unknown"
    responseCode: response.code | 0
    responseSize: response.size | 0
    latency: response.duration | "0ms"
  monitored_resource_type: '"UNSPECIFIED"'
---
apiVersion: "config.istio.io/v1alpha2"
kind: fluentd
metadata:
  name: handler
  namespace: istio-system
spec:
  address: "fluentd-es.logging:24224"
---
apiVersion: "config.istio.io/v1alpha2"
kind: rule
metadata:
  name: newlogtofluentd
  namespace: istio-system
spec:
  match: "true" # match for all requests
  actions:
   - handler: handler.fluentd
     instances:
     - newlog.logentry
EOF
~~~


* 트래픽 전달

~~~
$ curl -I http://$GW_URL/productpage
~~~

* Kibana 포트포워딩

~~~
$ kubectl -n logging port-forward $(kubectl -n logging get pod -l app=kibana -o jsonpath='{.items[0].metadata.name}') 5601:5601
~~~

* 결과 확인
  1. 브라우저에서 [_http://localhost:5601_](http://localhost:5601) 을 연다.
  1. 메인화면에서 "Index Pettterns" 선택
  1. Index pattern에 "*" 입력 하고 "Set up index patterns" 클릭
  1. Time Filter field name 에 @timestamp 선택하고 "Create index pattern" 클릭
  1. 좌측 메뉴의 "Discover" 클릭하여  현재 만든 "*"의 로그를 확인한다.
