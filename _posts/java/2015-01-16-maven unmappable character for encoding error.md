---
title:  "Maven unmappable character for encoding 오류"
date:    2015/01/16 17:51
categories: "java"
tags: []
keywords: ["maven-compiler-plugin","encoding"]
description: "File encoding has not been set, using platform encoding ANSI_X3.4-1968, i.e. build is platform dependent!"
---

# Maven unmappable character for encoding 오류

## 환경

- java 1.7.0
- maven 3.2.2
- CentOS 6.3 (locale = LANG=ko_KR.UTF-8)

## 현상

플랫폼(OS,리눅스) 기본 파일 encoding 이 다를 경우 (한글 encoding 으로 설치된 리눅스) 에서
UTF-8 로 개발된 소스를 maven 빌드 할 경우 아래와 같은 에러 발생

```
[WARNING] File encoding has not been set, using platform encoding ANSI_X3.4-1968, i.e. build is platform dependent!
 ……. unmappable character for encoding ASCII
 ```

## 해결방법

다음 처럼 pom.xml 에 maven-compiler-plugin 의 `encoding` 을 지정

```
<plugins>
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
    <encoding>UTF-8</encoding>              
    </configuration>
</plugin>
</plugins>
```
