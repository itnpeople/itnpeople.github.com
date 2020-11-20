---
title:  "Apache rotatelogs 를 이용한 로그 관리하기"
date:   2014/02/19 14:14
categories: "linux"
tags: []
keywords: ["Apache","httpd","logs"]
description: "웹서버의 성능을 위해서 rotatelogs를 활용하여 로그의 크기를 일정하게 늘어나지 않도록 해주는 방법"
---

# Apache rotatelogs 를 이용한 로그 관리하기


## 개요

아파치 error/access 로그는 기본설정상 계속 늘어나게 되며 로그의 크기가 커질 수록 어플의 성능에 안좋은 영향을 준다.

웹서버의 성능을 위해서 로그의 크기가 일정하게 늘어나지 않도록 해주는 것이 중요하다.

로그의 크기를 일정하여 유지하는 방법은 일반적인 방법은   
cron job에 shell 명령을 통해서 로그를 주기적으로 백업하고 비워주는 방법과  
아파치에 포함되어 있는 "rotatelogs" 을 통해서 일별 또는 사이즈별로 로그파일을 rotate 하는 방법이 있다.

## 로그 설정 (rotatelogs)

로그 레벨을 error 로 조정하고 "rotatelogs" 를 사용하여 일별/사이즈별로 rotate 하도록 조정한다

```
[apache@ ~]# vi /usr/local/apache/conf/httpd.conf	
```

```
#5M 단위로 rotate
#ErrorLog "logs/error_log"
ErrorLog "|/usr/local/apache/bin/rotatelogs /usr/local/apache/logs/error_log.%Y%m%d%H%M%S 5M"

#LogLevel info
LogLevel error

#일별 rotate
#CustomLog "logs/access_log" common
CustomLog "|/usr/local/apache/bin/rotatelogs /usr/local/apache/logs/access_log.%Y%m%d 86400" common	
```

## 참고
5M 처럼 M 이 붙는 경우는 해당 사이즈 만큼 될때마다 해당 파일을 백업  
M 이 붙지 않은 경우는 순환주기 마다 파일을 만든다. "86400" 은 24 시간임