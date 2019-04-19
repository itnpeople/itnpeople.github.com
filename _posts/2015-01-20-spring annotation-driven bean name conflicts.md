---
title:  "spring annotation-driven 사용시 bean name 중복(충돌,conflicts) 해결"
date:   2015/01/20 10:55
categories: "java"
tags: ["popular"]
keywords: ["annotation-driven", "spring", "conflicts with existing"]
description: "spring은 annotation-driven component scan 시 기본적으로 Bean 이름으로 id를 결정한다. 이때 동일한 이름의 클래스(컴포넌트)가 존재한다면 동일한 id 를 가지게 되고 'conflicts with existing' 오류가 발생한다. BeanNameGenerator를 커스트마이징하여 이를 해결 한다"
---

# spring annotation-driven 시 bean name 중복(충돌,conflicts) 해결
---

## 환경

- java 1.7.0
- spring 4.1.1

## 현상

spring은 annotation-driven component scan 시 기본적으로 `Bean 이름으로 id를 결정`한다. 예를 들어서 클래스명이 CblController 라면 id는 "cblController" 로 결정된다.
이때 다른 패키지에서 동일한 이름을 가진 클래스(컴포넌트)가 `중복으로 존재`한다면 동일한 id 를 가지게 되며 아래와 같은 에러 메시지를 볼 수 있다.

```
org.springframework.beans.factory.BeanDefinitionStoreException: Unexpected exception parsing XML document from file [.....\servlet-context.xml]; 
nested exception is org.springframework.context.annotation.ConflictingBeanDefinitionException: Annotation-specified bean name 'cblController' for bean class [......CblController] conflicts with existing, 
non-compatible bean definition of same name and class [......CblController]
```

## 해결방법

spring에서 기본 제공하는 BeanNameGenerator 를 사용하는 대신 다음과 같이 BeanNameGenerator를 `새로 만들어 해결`할 수 있다.

* BeanNameGenerator 를 상속 받아서 generateBeanName() 함수를 override 하고 프로젝트 구조에 맞도록 Bean 이름을 naming 한 로직을 추가
* Context xml 에 "name-generator" 에 커스트마이징한 BeanNameGenerator를 지정한다

아래 예제는 클래스명만 사용하는 대신 `full package 명으로 Bean 이름이 결정`되도록 커스트마이징된 BeanNameGenerator 예제이다.

```
package com.samples;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;

public class FullBeanNameGenerator implements org.springframework.beans.factory.support.BeanNameGenerator {

	@Override
	public String generateBeanName(BeanDefinition definition, BeanDefinitionRegistry registry) {
		return definition.getBeanClassName();
	}
}
```	

```
<beans 
    xmlns="http://www.springframework.org/schema/beans"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:context="http://www.springframework.org/schema/context"
    xsi:schemaLocation="http://www.springframework.org/schema/beans
	    http://www.springframework.org/schema/beans/spring-beans.xsd
	    http://www.springframework.org/schema/context
	    http://www.springframework.org/schema/context/spring-context.xsd>

    <context:component-scan base-package="com.samples.model" name-generator="com.samples.FullBeanNameGenerator"/>
```