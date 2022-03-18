---
title:  "Maven 빌드 시 dependency 라이브러리들을 특정 디렉토리로 복사하는 방법"
date:   2015/01/16 17:51
categories: "java"
tags: ["java", "maven"]
keywords: ["Dependency","J2EE","maven-dependency-plugin"]
description: "Maven 빌드 시 dependency 라이브러리들을 특정 디렉토리로 복사하는 방법"
---

# Maven 빌드 시 dependency 라이브러리들을 특정 디렉토리로 복사하는 방법

## 환경

- java 1.7.0
- maven 3.2.2

## Maven 빌드시 dependency 라이브러리들을 특정 디렉토리로 복사 방법

아래와 같이 `maven-dependency-plugin` 플러그인 을 "build > plugins" 태그에 정의한다


```
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-dependency-plugin</artifactId>
    <executions>
        <execution>
            <id>copy-dependencies</id>
            <phase>package</phase>
            <goals>
                <goal>copy-dependencies</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <outputDirectory>${deploy.target.dir}/lib</outputDirectory>
        <overWriteIfNewer>true</overWriteIfNewer>
    </configuration>

</plugin>
```

여기서 ${deploy.target.dir}는 외부 파라메터로 ${java.home}와 같이 기본으로 제공되는 내부 variable 이 아니다.
즉 build 실행 시 "-d" 옵션으로 특정 디렉토리를 지정해 주어야 한다.

