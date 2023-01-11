---
title:  Kubernetes apiserver Authentication
date:   2023/01/04 14:41
categories: "tip"
tags: ["kubernetes","apiserver","kube-apiserver","authenticate"]
tags: ["kubernetes","apiserver","kube-apiserver","authenticate"]
description: Development Tips - Kubernetes API-Server Authentication
---

# {{ page.title }}
> https://kubernetes.io/docs/reference/access-authn-authz/authentication/

**Table of Contents**

* _[X509 Client Certs](#x509-client-certs) - TODO_
* [Static Token File](#static-token-file)
* [Bootstrap Token](#bootstrap-token)
* [ServiceAccount Token](#serviceaccount-token)
* _[OpenID Connect Token](#openid-connect-token) - TODO_
* _[Webhook Token Authentication](#webhook-token-authentication) - TODO_
* _[Authenticating Proxy](#authenticating-proxy) - TODO_


## X509 Client Certs

//TODO

## Static Token File

* create a static token file (using `uuidgen` `openssl`)

```
# The static-token file is: Must be located in /etc/kubernetes/pki/ directory

$ sudo bash -c 'cat > /etc/kubernetes/pki/static-token.csv <<EOF
$(openssl rand -base64 32),token-user,$(uuidgen),"system:masters"
EOF'

$ cat /etc/kubernetes/pki/static-token.csv

c7cLEdumD3eVl/W2qQ5RAWQzhaWb7N5R9Bkl65hAk/4=,token-user,d70723d7-2272-4e44-a464-9a1fd6bcd13f,"system:masters"
```

* `--token-auth-file=` 옵션 지정

```
$ sudo vi  /etc/kubernetes/manifests/kube-apiserver.yaml

apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubeadm.kubernetes.io/kube-apiserver.advertise-address.endpoint: 10.30.20.139:6443
  labels:
    component: kube-apiserver
    tier: control-plane
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --token-auth-file=/etc/kubernetes/pki/static-token.csv
```

* verify

```
$ curl -i -k -H "Authorization: Bearer $(cat /etc/kubernetes/pki/static-token.csv | awk -F ',' 'FNR==1 {print $1}')" https://192.168.77.61:6443/api/v1/namespaces

HTTP/2 200
audit-id: 2982120c-0c8b-46bf-a4c3-0257b9dc5ba3
cache-control: no-cache, private
content-type: application/json
...
```


## Bootstrap Token
> bootstrap.kubernetes.io/token
> https://kubernetes.io/docs/reference/access-authn-authz/bootstrap-tokens/


### 개요

* API 서버에서 다음 플래그를 사용하여 부트스트랩 토큰 인증자를 활성화할 수 있다.

```
# /etc/kubernetes/manifests/kube-apiserver.yaml

--enable-bootstrap-token-auth
```

* 활성화되면 부트스트랩 토큰을 API 서버에 대한 요청을 인증하기 위한 전달자 토큰 자격 증명으로 사용할 수 있다.

```
Authorization: Bearer 07401b.f395accd246ae52d
```

### 사용방법

* bootstarp token 생성

```
$ kubeadm token create $(kubeadm token generate)
```

* bootstarp token secret 에서 TOKEN_ID, TOKEN_SECRET 조회

```
$ SECRET=$(kubectl get secret -n kube-system | grep bootstrap.kubernetes.io/token | awk 'FNR==1 { print $1 }')
$ TOKEN_ID=$(kubectl get secret ${SECRET} -n kube-system -o jsonpath='{.data.token-id}' | base64 --decode)
$ TOKEN_SECRET=$(kubectl get secret ${SECRET} -n kube-system -o jsonpath='{.data.token-secret}' | base64 --decode)
```

* bootstarp token `cluster-admin` 권한 부여
> 토큰은 사용자 이름 system:bootstrap:<token id> 로 인증되며 system:bootstrappers 그룹의 구성원

```
$ kubectl create clusterrolebinding bootstrap-token-binding --clusterrole=cluster-admin --user=system:bootstrap:${TOKEN_ID}
```

* 검증

```
$ curl -i -k -H "Authorization: Bearer ${TOKEN_ID}.${TOKEN_SECRET}" https://192.168.77.61:6443/api/v1/namespaces
$ curl -i -k -H "Authorization: Bearer ${TOKEN_ID}.${TOKEN_SECRET}" https://192.168.77.61:6443/apis/metrics.k8s.io/v1beta1/namespaces/default/pods
```



## ServiceAccount Token

> kubernetes.io/service-account-token

> https://kubernetes.io/docs/reference/access-authn-authz/authentication/#service-account-tokens


* create a serviceaccount and rolebinding

```
$ kubectl create serviceaccount admin-sa -n kube-public

$ kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: admin-sa-secret
  namespace: kube-public
  annotations:
    kubernetes.io/service-account.name: admin-sa
type: kubernetes.io/service-account-token
EOF

$ kubectl create clusterrolebinding admin-token-binding --clusterrole=cluster-admin --serviceaccount=kube-public:admin-sa
```

* access to the cluster using `kubectl` (`--token` option)

```
$ kubectl get nodes --token="$(kubectl get secret admin-sa-secret -n kube-public -o jsonpath='{.data.token}' | base64 --decode)"
```


* access to the cluster using `kubectl` (current kubeconfig file)

```
$ kubectl config set-credentials token-user --token="$(kubectl get secret admin-sa-secret -n kube-public -o jsonpath='{.data.token}' | base64 --decode)"
$ kubectl config set-context token-cluster --cluster=$(kubectl config get-clusters |  awk 'FNR==2 {print $1}') --user=token-user
$ kubectl config use-context token-cluster --cluster=$(kubectl config get-clusters |  awk 'FNR==2 {print $1}') --user=token-user
$ kubectl get nodes
```

* access to the cluster using `kubectl` (external kubeconfig file)

```
$ echo -e "apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: $(kubectl get secret admin-sa-secret -n kube-public -o jsonpath='{.data.ca\.crt}')
    server: $(kubectl config view -o jsonpath="{.clusters[?(@.name==\"$(kubectl config view -o jsonpath="{.contexts[?(@.name==\"$(kubectl config current-context)\")].context.cluster}")\")].cluster.server}")
  name: admin-cluster
contexts:
- context:
    cluster: admin-cluster
    user: admin-user
  name: admin
current-context: admin
users:
- name: admin-user
  user:
    token: $(kubectl get secret admin-sa-secret -n kube-public -o jsonpath='{.data.token}' | base64 --decode)
" > kubeconfig-token.yaml

$ kubectl get nodes --kubeconfig="$(pwd)/kubeconfig-token.yaml"
```


* clean-up

```
$ kubectl delete serviceaccount admin-sa -n kube-public
$ kubectl delete clusterrolebinding admin-token-binding
$ kubectl delete secret admin-sa-secret -n kube-public
$ rm kubeconfig-token.yaml
```


## OpenID Connect Token

//TODO

* OIDC Authenticator

```
# Option 1 - OIDC Authenticator
kubectl config set-credentials mmosley  \
        --auth-provider=oidc  \
        --auth-provider-arg=idp-issuer-url=https://oidcidp.tremolo.lan:8443/auth/idp/OidcIdP  \
        --auth-provider-arg=client-id=kubernetes  \
        --auth-provider-arg=client-secret=1db158f6-177d-4d9c-8a8b-d36869918ec5  \
        --auth-provider-arg=refresh-token=q1bKLFOyUiosTfawzA93TzZIDzH2TNa2SMm0zEiPKTUwME6BkEo6Sql5yUWVBSWpKUGphaWpxSVAfekBOZbBhaEW+VlFUeVRGcluyVF5JT4+haZmPsluFoFu5XkpXk5BXqHega4GAXlF+ma+vmYpFcHe5eZR+slBFpZKtQA= \
        --auth-provider-arg=idp-certificate-authority=/root/ca.pem \
        --auth-provider-arg=id-token=eyJraWQiOiJDTj1vaWRjaWRwLnRyZW1vbG8ubGFuLCBPVT1EZW1vLCBPPVRybWVvbG8gU2VjdXJpdHksIEw9QXJsaW5ndG9uLCBTVD1WaXJnaW5pYSwgQz1VUy1DTj1rdWJlLWNhLTEyMDIxNDc5MjEwMzYwNzMyMTUyIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL29pZGNpZHAudHJlbW9sby5sYW46ODQ0My9hdXRoL2lkcC9PaWRjSWRQIiwiYXVkIjoia3ViZXJuZXRlcyIsImV4cCI6MTQ4MzU0OTUxMSwianRpIjoiMm96US15TXdFcHV4WDlHZUhQdy1hZyIsImlhdCI6MTQ4MzU0OTQ1MSwibmJmIjoxNDgzNTQ5MzMxLCJzdWIiOiI0YWViMzdiYS1iNjQ1LTQ4ZmQtYWIzMC0xYTAxZWU0MWUyMTgifQ.w6p4J_6qQ1HzTG9nrEOrubxIMb9K5hzcMPxc9IxPx2K4xO9l-oFiUw93daH3m5pluP6K7eOE6txBuRVfEcpJSwlelsOsW8gb8VJcnzMS9EnZpeA0tW_p-mnkFc3VcfyXuhe5R3G7aa5d8uHv70yJ9Y3-UhjiN9EhpMdfPAoEB9fYKKkJRzF7utTTIPGrSaSU6d2pcpfYKaxIwePzEkT4DfcQthoZdy9ucNvvLoi1DIC-UocFD8HLs8LYKEqSxQvOcvnThbObJ9af71EwmuE21fO5KzMW20KtAeget1gnldOosPtz1G5EwvaQ401-RPQzPGMVBld0_zMCAwZttJ4knw

# Option 2 - Use the --token Option
kubectl --token=eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwczovL21sYi50cmVtb2xvLmxhbjo4MDQzL2F1dGgvaWRwL29pZGMiLCJhdWQiOiJrdWJlcm5ldGVzIiwiZXhwIjoxNDc0NTk2NjY5LCJqdGkiOiI2RDUzNXoxUEpFNjJOR3QxaWVyYm9RIiwiaWF0IjoxNDc0NTk2MzY5LCJuYmYiOjE0NzQ1OTYyNDksInN1YiI6Im13aW5kdSIsInVzZXJfcm9sZSI6WyJ1c2VycyIsIm5ldy1uYW1lc3BhY2Utdmlld2VyIl0sImVtYWlsIjoibXdpbmR1QG5vbW9yZWplZGkuY29tIn0.f2As579n9VNoaKzoF-dOQGmXkFKf1FMyNV0-va_B63jn-_n9LGSCca_6IVMP8pO-Zb4KvRqGyTP0r3HkHxYy5c81AnIh8ijarruczl-TK_yF5akjSTHFZD-0gRzlevBDiH8Q79NAr-ky0P4iIXS8lY9Vnjch5MF74Zx0c3alKJHJUnnpjIACByfF2SCaYzbWFMUNat-K1PaUk5-ujMBG7yYnr95xD-63n8CO8teGUAAEMx6zRjzfhnhbzX-ajwZLGwGUBT4WqjMs70-6a7_8gZmLZb2az1cZynkFRj2BaCkVT3A2RrjeEwZEtGXlMqKJ1_I2ulrOVsYx01_yD35-rw get nodes
```

## Webhook Token Authentication

//TODO

## Authenticating Proxy

//TODO
