---
title:  "PostgreSQL Yum Install & Setup"
date:   2018/11/18 1:22
categories: "linux"
tags: [""]
keywords: ["centos","pgsql","install"]
description: "CentOS 6에 PostgreSQL 설치(yum) 및 데이터베이스 시작하기"
---

# CentOS 6에 PostgreSQL 설치(yum) 하고 데이터베이스 설정하고 시작하기
---

## 환경

- CentOS 6.7
- PostgreSQL 11.2

## 참조

- <http://wiki.postgresql.org/wiki/YUM_Installation/>


## 설치 순서

1. YUM repository 설정

2. PostgreSQL 설치



## YUM repository 설정

* 설정파일 열고 "[base], [updates]" 섹션에 "exclude=postgresql*" 라인 추가

* conf 파일은 리눅스 버전별로 다름, 위에 참고 링크참조

  ```console
# vi /etc/yum.repos.d/CentOS-Base.repo
```

* 예

  ```
[base]
.......
exclude=postgresql*
[updates]
.......
exclude=postgresql*
```

* PGDG RPM 파일 다운로드 및 설치

* OS 에 맞는 파일 선택, <http://yum.postgresql.org/repopackages.php> 참조

  ```console
# curl -O https://download.postgresql.org/pub/repos/yum/11/redhat/rhel-6-x86_64/pgdg-centos11-11-2.noarch.rpm
# rpm -ivh pgdg-centos11-11-2.noarch.rpm
```

## PostgreSQL 설치

* 설치 가능 패키지 조회

```console
# yum list postgres*
```

* 설치 

```console
# yum install postgresql11.x86_64 postgresql11-server.x86_64
```

* postgres 사용자 비밀번호 등록(postgres 계정은 설치시 자동 생성된다)

```console
# passwd postgres
(비밀번호 입력)
```

* 데이터베이스 초기화

```console
# service postgresql-11 initdb  -E 'UTF-8' --lc-collate='ko_KR.UTF-8' --lc-ctype=locale='ko_KR.UTF-8'
```

* OS 시작시 자동시작처리

```console
# chkconfig postgresql-11 on
```


## 접속 조소 및 포트 정의 및 기타

* postgresql.conf 을 열고

  * listen_addresses 포트 주석을 풀고 값을 "*" 로 변경 "CONNECTIONS AND AUTHENTICATION" 섹션에 있음 (약 59라인 정도)

  * "port = 5432" 주석을 푼다

  * "standard_conforming_strings = off" 으로 변경 

  * 참고
  
    * listen_addresses, port 는 "CONNECTIONS AND AUTHENTICATION" 섹션에 있음 (약 59라인 정도)

	* standard_conforming_strings는 파일 끝 부근에 있음 (약 655라인 정도)

```console
# cp /var/lib/pgsql/11/data/postgresql.conf  /var/lib/pgsql/11/data/postgresql.conf.original
# vi /var/lib/pgsql/11/data/postgresql.conf 
```

```
listen_addresses = '*'
port = 5432
standard_conforming_strings = off
```

## 클라이언트 접속 가능 IP 설정 (전체 IP 오픈)

```console
# cp /var/lib/pgsql/11/data/pg_hba.conf /var/lib/pgsql/11/data/pg_hba.conf.original
# vi /var/lib/pgsql/11/data/pg_hba.conf
```

마지막에 아래 라인 추가

```
host  all  all  0.0.0.0/0  password
```

## 방화벽 (5432포트) 열기

```console
# vi /etc/sysconfig/iptables
```

적당한 부분에 아래 라인 추가

```
-A INPUT -m state --state NEW -m tcp -p tcp --dport 5432 -j ACCEPT
```

재시작
```console
# service iptables restart
```

## postgreSQL 서비스 시작

```console
# service postgresql-11 start
```
