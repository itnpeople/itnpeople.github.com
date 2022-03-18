---
title:  Kubernetes Security
date:   2022/03/18 9:42
categories: "tip"
tags: ["kubernetes","cerificate","rbac"]
keywords: ["kubernetes","cerificate","rbac"]
description: Development Tips - Kubernetes Certification & RBAC
---

# {{ page.title }}

**Table of Contents**

* [Certification](#certification)
* [RBAC](#rbac)


## Certification

### Self-sign SSL 인증서
> 모든 인증서는 발급기관(CA) 이 있어야 하나 최상위에 있는 인증기관(root ca)은 서명해줄 상위 인증기관이 없으므로 root ca의 개인키로 스스로의 인증서에 서명하여 최상위 인증기관 인증서를 만든다. 이렇게 스스로 서명한 ROOT CA 인증서를 Self Signed Certificate 라고 부른다.

* Self-sign 인증서 생성

```
▒ KEY_FILE=server.key
▒ CERT_FILE=server.crt
▒ CERT_NAME=docker-registry-tls-cert
▒ IP=101.55.69.105

# 인증서 생성
▒ openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ${KEY_FILE} -out ${CERT_FILE} -subj "/CN=${IP}/O=${IP}" -reqexts SAN -extensions SAN -config <(cat /etc/ssl/openssl.cnf <(printf "[SAN]\nsubjectAltName=IP:${IP}"))
```

* 생성된 인증서를 TLS secret 로 만들기

```
▒ kubectl create secret tls ${CERT_NAME} --key ${KEY_FILE} --cert ${CERT_FILE}
```

* MacOS 에서 self-sign 인증서 적용한 HTTPS로 접속하는 경우 
키체인에 시스템 인증서로 등록 https://docs.docker.com/docker-for-mac/#add-custom-ca-certificates-server-side)

```
▒ sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${CERT_FILE}
```

## RBAC

### Default roles and role bindings
> Kubernetes cluster의 pre-definiation default roles & role binings

* [공식문서](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#default-roles-and-role-bindings) 참조


### Default RBAC when creating namespace

* serviceaccount 를 생성하면 `kubernetes.io/service-account.name: <serviceaccount name>` annotation을 가진 secret이 동시에 자동 생성
* namespace를 생성하면 `default` 라는 이름의 serviceaccount가 동시에 자동 생성
* 즉 namespace를 생성하면 namespace, serviceaccount, secret 동시에 생성
* InClusterConfig 환경에서 해당 default serviceaccount 에 role을 binding 하여 권한을 지정해 줄 수 있음

#### Kubernetes-dashboard's default RBAC
* 링크
  * [Access control](https://github.com/kubernetes/dashboard/tree/master/docs/user/access-control)
  * [Creating sample user](https://github.com/kubernetes/dashboard/blob/master/docs/user/access-control/creating-sample-user.md)

* 설명
  1. serviceaccount "admin-user"를 생성
  1. serviceaccount "admin-user" clusterrole "cluster-admin"(default clusterrole) 에  clusterrole binding
  1. `kubectl describe secret <secret name>` 명령으로 "admin-user"를 생성하면서 자동 생성된 secret의 bearer token을 조회 
  1. 로그인 화면에서  조회된 token 값을 입력하여 serviceaccount "admin-user"의 권한이 부여됨