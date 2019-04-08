---
title:  "Istio Performance & Stability"
date:   2018/04/08 10:30
categories: "cloud"
tags: ["recent"]
keywords: ["kubernetes","istio","performance","stability","쿠버네티스","이스티오"]
description: "이스티오 성능 및 안정성 테스트"
---

# Istio Performance & Stability
https://istio.io/docs/concepts/performance-and-scalability/

## 개요

* 1000 services and 2000 sidecars with 70,000 mesh-wide requests per second

### Performance Summary
* Offical Load Test 결과는 아래와 같음
  * Envoy 프록시 초당 100건 - 0.6 vCPU and 50 MB memory 사용
  * istion-telemery  서비스 - 0.6 vCPU 사용
  * Pilot - 1 vCPU, 1.5G memory 사용
  * Envoy 프록시 latency -  8ms가 90%

### Control plane performance

* configurations and possible system states 에 따라서 CPU, Memory 필요량 결정
* CPU 사이즈는 다음 사항에 따라 결정
  * The rate of deployment changes.
  * The rate of configuration changes.
  * The number of proxies connecting to Pilot.
* a single Pilot instance can support 1000 services, 2000 sidecars with 1 vCPU and 1.5 GB of memory.

### Data plane performance
* 데이터 플레인의 성능은 아래 사항이외에도 많은 요소에 따라 결정됨
  * Number of client connections
  * Target request rate
  * Request size and Response size
  * Number of proxy worker threads*
  * Protocol
  * CPU cores
  * Number and types of proxy filters, specifically Mixer filter.

### CPU & Memory
* // TODO

### Latency
* // TODO

### benchmark 툴

#### fortio.org
* 이스티오 로드 테스팅툴로 시작
* 실행시간을 퍼센트로 계산해서 기록해줌

* 실치 (mac)
  * brew install fortio
  * Docker 설치도 가능

* 사용예제
~~~
$ fortio load http://www.google.com
~~~


## Offical Performance Test 프로젝트

### /istio-install 
* https://github.com/istio/tools/tree/master/perf/istio-install
* 성능테스트를 위해 Istio를 설정하는 스크립트 및 Helm 제공.
* 이 클러스터는 Istio의 한계를 테스트하기 위한 아주 큰 클러스터로  설계되어 있다. 
* 대부분의 테스트는 Istio 표준 설치 상태에서 실행할 수 있다.
* 성능체크를 위한 이스티오 성능 권장 설정되어 있으나 대용량 클러스터가 필요, 적어도 32 vCPU 

### /load
* 로드 구성 : https://github.com/istio/tools/tree/master/perf/load
* 이스티오 havey load 상에서 테스트하기 위한 대용량 서비스를 생성하는 툴을 제공
* Fortio 인스턴스로 설치됨
* 각 인스턴스는 적어도 6 vCPU에 6G 메모리 필요 (그림상으로는 인스턴스가 9인데. 그럼 54 vCPU에 54G 리소스가 필요한건가?)

### /benchmark 
* https://github.com/istio/tools/tree/master/perf/benchmark
* 파드와 다양한 셋업 간의 트래픽 메트릭스와 latency를 측정하는 테스트를 제공
* 다양한 페이로드 크기와 커넥션 수를 변경하며 각 설정값에서 두개의 파드간의 성능 측정
* 측정 변경값 : 커넥션수, qps
* 측정 시나리오
  * default : sidecar -> sidecar
  * serversidecar : client -> sidecar
  * baseline : clinet -> server

* 결과분석
  * Fortio & Prometheus 로 부터 qps, cpu/memory, latency 추출

### /stability
* https://github.com/istio/tools/tree/master/perf/stability
* Istio의  안정성을 보장하기 위해서 다양한 Istio의 기능을 발휘하는 테스트를 제공
* 테스트의 목적은 통합테스트와 차별화된 장기적고 연속적으로 실행된다.

* 테스트 종류
  * http10 : http 1.0 지원 테스트
  * graceful-shutdown
    * 프록시의 자연스러운 종료를 보장하는지를 테스트임
    * 서버가 재배포될때 연결이 끊어지지 않게 트래픽들이 새로운 배포로 자연스럽게 옮겨지는지 확인 
  * gateway-bouncer : 게이트웨이 준바상태 테스트
  * istio-upgrader : 기본값이 아님. 이스티오 컴포넌들을 재배치 이스티오 전체에 영향을 미치는지
  * allconfig : 현재버그 있음
  * sds-certmanager : g클라우드 GCP DNS 설정과  gcp DNS 존 DNS_ZONE 환경변수 값 지정 필요

* 성능 분석
  * Grafana 대시보드 : 테스트 성능분석 및 상태 측정에 유용할 툴
  * https://github.com/istio/tools/blob/master/metrics/check_metrics.py :  프로메테우스로부터 metrics 를 가져고 각각의 시나리오의 상태를 확인하기 위한 분석 할 수 있음. Grafana 만으로는 괜찮은 실행상태인지 판단하기 애매한 몇몇 테스트에 유용함


## 준비작업 (Performance, Stability 테스트 공통)


### minikube
* minikube 인스턴스 삭제 설치 (minikube 설치 되어있다는 전제)
* minikube 기본값으로 kubernetes + istio 설치 + 성능측정이 불가능하므로 리소스를 늘려서(6cpu, 8g) 인스턴스를 생성한다. 

~~~
$ minikube delete
$ minikube start --cpus 6 --memory 8192
$ minikube ssh
~~~

### Helm 초기화 
* helm 클라이언트가 설치되었다는 전제ß
~~~
$ helm init
~~~

### istio 설치
* 몇가지 설치 방법 중 helm 으로 설치 (https://istio.io/docs/setup/kubernetes/install/helm/)
~~~
$ wget https://github.com/istio/istio/releases/download/1.1.1/istio-1.1.1-osx.tar.gz
$ tar -vxzf istio-1.1.1-osx.tar.gz
$ cd istio-1.1.1
$ kubectl create namespace istio-system
$ helm template install/kubernetes/helm/istio-init --name istio-init --namespace istio-system | kubectl apply -f -
$ helm template install/kubernetes/helm/istio --name istio --namespace istio-system | kubectl apply -f -
~~~

* minikube에 설치하므로 편의상 등록된 istio-ingressgateway, prometheus 서비스는 LoadBalancer Type 에서 NodePort Type으로 바꿔준다.
~~~
$ kubectl edit service/istio-ingressgateway -n istio-system
$ kubectl edit service/prometheus -n istio-system
$ kubectl get service -n istio-system
~~~

### 테스트 프로젝트 다운로드
~~~
$ git clone https://github.com/istio/tools.git
$ cd tools
~~~


## Benchmark 테스트 진행

### 준비작업
~~~
$ cd perf/benchmark
$ export NAMESPACE=twopods
$ kubectl create namespace $NAMESPACE
$ kubectl label namespace $NAMESPACE istio-injection=enabled
$ DNS_DOMAIN=local ./setup_test.sh
~~~

* twopods 라는 namespace로 "fortioclient", "fortioserver" 2개 파드가 생성


### 실행
~~~
$ python runner/runner.py 2,4 10,40 30 --serversidecar --baseline
~~~
30초 동안 12개 테스트가 진행된다.


### 결과확인

* 프로메테우스, fortio URL 확인
~~~
$ echo ""http://$(minikube ip):$(kubectl get service/prometheus -n istio-system -o  'jsonpath={.spec.ports[0].nodePort}')""
$ echo "http://$(minikube ip):$(kubectl get service/fortioclient -n twopods -o  'jsonpath={.spec.ports[0].nodePort}')"
~~~

* 결과확인 전에 portio.py 에 METRICS_START_SKIP_DURATION 값(해당 지정초 이전 데이터는 측정에서 SKIP 처리)을 0으로 바꿔준다. default 값은 62, 30초 테스트(연습으로) 했으므로 데이터가 조회되지 않음
* 첫번째 URL은 fortio, 두번째는 prometheus
~~~
$ python ./runner/fortio.py  FORTIO_URL PROMETHEUS_URL --csv StartTime,ActualDuration,Labels,NumThreads,ActualQPS,p50,p90,p99,cpu_mili_avg_telemetry_mixer,cpu_mili_max_telemetry_mixer,mem_MB_max_telemetry_mixer,cpu_mili_avg_fortioserver_deployment_proxy,cpu_mili_max_fortioserver_deployment_proxy,mem_MB_max_fortioserver_deployment_proxy,cpu_mili_avg_ingressgateway_proxy,cpu_mili_max_ingressgateway_proxy,mem_MB_max_ingressgateway_proxy
~~~

#### Web UI에서 결과확인
* 앞서 확인했던 FORTIO_URL PROMETHEUS_URL 을 웹브라우저에서 열면 확인가능
* 프로메테우스 예제 쿼리를 실제 데이터 확인
~~~
irate(container_cpu_usage_seconds_total{container_name=~"mixer|policy|discovery|istio-proxy|captured|uncaptured"}[1m])
~~~

* 프로메테우스 API 호출은 다음과 같음
~~~
PROMETHEUS_URL/api/v1/query_range?start=2019-04-03T01:00:00.000Z&end=2019-04-03T02:00:00.000Z&step=15&query=irate(container_cpu_usage_seconds_total{container_name=~"mixer|policy|discovery|istio-proxy|captured|uncaptured"}[1m])
~~~

## stability 테스트 진행

### 준비작업
~~~
$ cd perf/stability/
~~~

* minikube를 사용해서 istio-ingressgateway 를 NodePort로 변경했기 때문에 아래와 같이 gateway 주소를 변경해준다.
~~~
 vi setup_tests.sh
~~~

* 39라인을 다음과 같이 수정
~~~
#  local gateway=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingres/s[0].ip}')
local gateway="http://$(minikube ip):$(kubectl get service/istio-ingressgateway -n istio-system -o  'jsonpath={.spec.ports[0].nodePort}')"
~~~


### http10 테스트 실행

~~~
$ TESTS="http10" ./setup_tests.sh setup
~~~


### 네임스페이스 gateway-bouncer 조정 작업

* 사용하는  ingree를 아래와 같이 NodePort로 변경해준다.
~~~
vi ./gateway-bouncer/templates/ingress.yaml
~~~
~~~
  type: NodePort
~~~

* ingree를 아래와 같이 NodePort로 변경해 주었으므로 아래와 같이 clusterIP를 사용하도록 수정
~~~
vi gateway-bouncer/setup.sh
~~~
~~~
#  INGRESS_IP=$(kubectl -n ${NAMESPACE} get service istio-ingress-${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
   INGRESS_IP=$(kubectl -n ${NAMESPACE} get service istio-ingress-${NAMESPACE} -o jsonpath='{.spec.clusterIP}')
 ~~~

 ~~~
 $ kubectl get pod -n http10
 $ kubectl get pod -n gateway-bouncer
 $ kubectl get pod -n graceful-shutdown
 ~~~

### http10 테스트 결과분석

* 프로메테우스 서비스 URL
~~~
$ echo "http://$(minikube ip):$(kubectl get svc/prometheus -n istio-system -o jsonpath={.spec.ports[0].nodePort})"
~~~
 
* 프로메테우스 예제 쿼리
~~~
irate(container_cpu_usage_seconds_total{namespace="http10"}[1m])
irate(container_cpu_usage_seconds_total{container_name=~"http10.+"}[1m])
~~~