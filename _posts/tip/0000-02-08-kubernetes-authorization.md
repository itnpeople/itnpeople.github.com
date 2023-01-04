---
title:  Kubernetes Authorization
date:   2023/01/04 14:41
categories: "tip"
tags: ["kubernetes","authorization","RBAC","authorize"]
keywords: ["kubernetes","authorization","RBAC","authorize"]
description: Development Tips - Kubernetes Authorization
---

# {{ page.title }}

**Table of Contents**

* [Default roles and role bindings](#default-roles-and-role-bindings)
* [Default RBAC when creating namespace](#default-rbac-when-creating-namespace)


## Default roles and role bindings
> Kubernetes cluster의 pre-definiation default roles & role binings

* [공식문서](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#default-roles-and-role-bindings) 참조


## Default RBAC when creating namespace

* serviceaccount 를 생성하면 `kubernetes.io/service-account.name: <serviceaccount name>` annotation을 가진 secret이 동시에 자동 생성
* namespace를 생성하면 `default` 라는 이름의 serviceaccount가 동시에 자동 생성
* 즉 namespace를 생성하면 namespace, serviceaccount, secret 동시에 생성
* InClusterConfig 환경에서 해당 default serviceaccount 에 role을 binding 하여 권한을 지정해 줄 수 있음

### Kubernetes-dashboard's default RBAC
* 링크
  * [Access control](https://github.com/kubernetes/dashboard/tree/master/docs/user/access-control)
  * [Creating sample user](https://github.com/kubernetes/dashboard/blob/master/docs/user/access-control/creating-sample-user.md)

* 설명
  1. serviceaccount "admin-user"를 생성
  1. serviceaccount "admin-user" clusterrole "cluster-admin"(default clusterrole) 에  clusterrole binding
  1. `kubectl describe secret <secret name>` 명령으로 "admin-user"를 생성하면서 자동 생성된 secret의 bearer token을 조회 
  1. 로그인 화면에서  조회된 token 값을 입력하여 serviceaccount "admin-user"의 권한이 부여됨