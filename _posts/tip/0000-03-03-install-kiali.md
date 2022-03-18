---
title:  kiali Installation
date:   2022/03/18 9:42
categories: "tip"
tags: ["kubernetes","kiali"]
keywords: ["kubernetes","kiali"]
description: Development Tips - Kiali Installation
---

# {{ page.title }}
> istio 1.4.0 기준


* Kiali 로그인 계정(Secret) 생성

~~~
▒ KIALI_USERNAME=$(echo -n 'admin' | base64)
▒ KIALI_PASSPHRASE=$(echo -n 'admin' | base64)
▒ kubectl apply -f - <<EOF
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

## Installation

~~~
▒ cp istio-1.4.0/install/kubernetes/helm/istio/templates/_affinity.tpl istio-1.4.0/install/kubernetes/helm/istio/charts/kiali/templates
▒ helm template istio-1.4.0/install/kubernetes/helm/istio/charts/kiali --name kiali --namespace istio-system | kubectl apply -f -
~~~

### Values

* Helm 설치 - 외부(다른 네임스페이스) 프로메테우스 사용시
  * prometheus.enabled=false
  * prometheusAddr=http://prometheus.anynamespace.svc.cluster.local:80

~~~
▒  helm template istio-1.4.0/install/kubernetes/helm/istio/charts/kiali --name kiali --namespace istio-system \
--set prometheus.enabled=false \
--set prometheusAddr=http://prometheus-addon.cocktail-addon.svc.cluster.local:80 \
| kubectl apply -f -
~~~

* 익명 로그인
  * dashboard.auth.strategy="anonymous"
  * Secret 생성할 필요 없음
  * istio 1.2.4 이전 패키징 차트에서는 해당 옵션이 없었음

~~~
▒  helm template istio-1.4.0/install/kubernetes/helm/istio/charts/kiali --name kiali --namespace istio-system \
--set dashboard.auth.strategy="anonymous" \
| kubectl apply -f -
~~~