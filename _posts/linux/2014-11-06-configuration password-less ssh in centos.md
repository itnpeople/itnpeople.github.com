---
title:  "CentOS Password-less SSH 설정 방법"
date:    2014/11/06 11:50
categories: "linux"
tags: ["linux", "apache", "httpd","centos"]
keywords: ["Apache","httpd","CentOS"]
description: "Password-less SSH 는 서버간 ssh 연결시 비밀번호 입력없이 상호 trust된 연결이 되도록 지정해 주는 것 방법"
---

# CentOS Password-less SSH 설정 방법

## 개요

Password-less SSH 는 서버간 ssh 연결시 비밀번호 입력없이 상호 trust된 연결이 되도록 지정해 주는 것을 말합니다.

## 환경
***

* CentOS

* 호스트 구성
```
HOST1 10.146.0.16
HOST2 10.146.0.17
HOST3 10.146.0.18
```

## 설치
*** 

* HOST1, HOST2, HOST3 에서 `ssh-client` 패키지를 설치하고 `ssh-keygen` 명령을 통해 "authorized key" 파일을 생성 합니다.

```
$ yum install openssh-clients


$ ssh-keygen -t dsa -P '' -f ~/.ssh/id_dsa
$ cp ~/.ssh/id_dsa.pub ~/.ssh/authorized_keys
```

* 서버들간 "authorized_keys" 복사합니다.

 ```
# HOST1
$ cat ~/.ssh/id_dsa.pub | ssh ${USER}@10.146.0.17 "cat >> ~/.ssh/authorized_keys"
$ cat ~/.ssh/id_dsa.pub | ssh ${USER}@10.146.0.18 "cat >> ~/.ssh/authorized_keys"

# HOST2
$ cat ~/.ssh/id_dsa.pub | ssh ${USER}@10.146.0.16 "cat >> ~/.ssh/authorized_keys"
$ cat ~/.ssh/id_dsa.pub | ssh ${USER}@10.146.0.18 "cat >> ~/.ssh/authorized_keys"

# HOST3
$ cat ~/.ssh/id_dsa.pub | ssh ${USER}@10.146.0.16 "cat >> ~/.ssh/authorized_keys"
$ cat ~/.ssh/id_dsa.pub | ssh ${USER}@10.146.0.17 "cat >> ~/.ssh/authorized_keys"
```

* 확인

```
$ ssh ssh ${USER}@10.146.0.17 "ls /"
```