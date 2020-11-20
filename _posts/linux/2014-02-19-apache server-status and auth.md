---
title:  "아파치 상태 모니터링 (server-status) 및 권한 설정"
date:   2014/02/19 14:26
categories: "linux"
tags: []
keywords: ["Apache","httpd","모니터링","보안"]
description: "아파치 웹서버 모니터링을 설정하고 해당 URL의 접근제한을 지정하는 방법"
---

# 아파치 상태 모니터링 (server-status) 및 접근제한 설정


## 개요
아파치는 상태 모니터링 (server-status) 기능을 기본으로 제공한다.

이때 이 상태 모니터링 URL의 접근 제한을 지정 할 수 있는데

1. "IP로 제한"하는 방법
1. "아이디/비밀번호 제한"하는 방법
1. "아이디/비밀번호를 통한 그룹으로 제한" 하는 방법

이 있다.

## 접근 제한 설정법

공통적으로 다음과 같이 httpd.conf 파일열고 "httpd-info" 파일의 include 리마크 해제한다.

```
[apache@ ~]# vi /usr/local/apache/conf/httpd.conf
```

```
# 다음 라인 리마크 해제
Include conf/extra/httpd-info.conf	
```

- IP 로 접근 제한

```
[apache@ ~]# vi /usr/local/apache/conf/extra/httpd-info.conf	
```

```
<Location /server-status>
	SetHandler server-status
	Order deny,allow
	Deny from all
	Allow from 222.106.59.0/24
</Location>	
```

  Allow from을 사용하여 접근 할 수 있는 IP를 제한한다.

  IP를 추가하고자 한다면 Allow from 라인을 계속 추가하거나 "222.106.59" 와 같이 IP c클래스로 확장 가능

- 아이디/비밀번호로 제한

```
[apache@ ~]# vi /usr/local/apache/conf/extra/httpd-info.conf
```

```
<Location /server-status>
	SetHandler server-status
	AuthType Basic
	AuthName "Restricted Files"
	AuthUserFile /usr/local/apache/passwd/passwords
	Require user honester
</Location>	
```

사용자별 비밀번호	파일 생성

```
[apache@ ~]# mkdir /usr/local/apache/passwd
/usr/local/apache/bin/htpasswd -c /usr/local/apache/passwd/passwords honester
(비밀번호 입력)	
```

- 아이디/비밀번호로 제한 (그룹으로)

```
[apache@ ~]# vi /usr/local/apache/conf/extra/httpd-info.conf	
```

```
<Location /server-status>
	SetHandler server-status
	AuthType Basic
	AuthName "Restricted Files"
	AuthUserFile /usr/local/apache/passwd/passwords
	AuthGroupFile /usr/local/apache/passwd/groups
	Require group admin
</Location>
```

사용자별 비밀번호	파일 생성

```
[apache@ ~]# mkdir /usr/local/apache/passwd
/usr/local/apache/bin/htpasswd -c /usr/local/apache/passwd/passwords itnpeople
(비밀번호 입력)
/usr/local/apache/bin/htpasswd -c /usr/local/apache/passwd/passwords honester
(비밀번호 입력)	
```

그룹파일 생성하고 그룹명, 앞서 등록한 사용자명을 "spacebar"로 구분하여 차례로 등록한다.

```
[apache@ ~]# vi /usr/local/apache/passwd/groups	
```

```
admin : honester itnpeople	
```
