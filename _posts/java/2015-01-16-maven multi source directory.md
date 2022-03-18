---
title:  "Maven 멀티 소스 디렉토리 지정 방법"
date:   2015/01/16 17:47
categories: "java"
tags: ["java", "maven"]
keywords: ["maven-compiler-plugin","includes"]
description: "Maven 멀티 소스 디렉토리 지정 방법"
---

# Maven 멀티 소스 디렉토리 지정 방법

## 환경

- java 1.7.0
- maven 3.2.2

## 방법

pom.xml 의 build > `sourceDirectory` 노드 값을 "." 로 정의하고

maven-compiler-plugin 의 configuration > `includes`에서 n개의 `include` 노드를 추가한다.


```
<build>
    <sourceDirectory>.</sourceDirectory>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <includes>
                    <include>src/main/jdf/**/*.java</include>
                    <include>src/main/java/**/*.java</include>
                </includes>
            </configuration>
        </plugin>
    <plugins>
</build>
```
