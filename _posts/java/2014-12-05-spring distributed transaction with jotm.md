---
title:  "Spring framework 4.0.x 에서 JOTM(Java Open Transacdtion Manager) 을 이용한 분산 트랜잭션 처리 방법"
date:   2014/02/19 14:26
categories: "java"
tags: ["java", "spring","jotm"]
keywords: ["spring","transaction","jotm"]
description: "스프링 프레임워크에서 분산 트랜잭션을 설정하고 활용하는 방법"
---

# Spring framework 4.0.x 에서 JOTM(Java Open Transacdtion Manager) 을 이용한 분산 트랜잭션 처리 방법

## 개요

### 분산 트랜잭션의 정의

distributed transactions, 2-phase transactions, global transactions
여러 개의 데이터베이스, JMS, 또는 그 외의 리소스들간의 트랜잭션을 보장하는 것


### 개발관점에서 일반적인 데이터베이스의 분산 트랜잭션 처리는

데이터베이스 별로 2-phase XA Protocol을 지원하는 JDBC 드라이버를 사용하여 DataSource를 정의

각각의 데이터소스에 대한 TransactionManager를 하나의 JtaTransactionManager 로 정의

각각의 Dao 는 자신의 대상 DataSource 를 통하여 해당 데이터베이스에 접근하여 비즈니스 로직 처리

### 그러나

**톰캣과 같이 분산 트랜잭션 서비스를 지원하지 않는 컨테이너를 사용하거나 아예 사용할 컨테이너가 없는 경우는**

추가적으로 atomikos (http://www.atomikos.com/), jotm (Java Open Transation Manager, http://jotm.objectweb.org/) 등을 이용한 작업이 필요하고  
**작업방식은 다시 2가지 정도로 나뉘어 짐**

- 컨테이너에 분산 트랜잭션 지원하도록 정의

  [http://www.atomikos.com/Documentation/TomcatIntegration](http://www.atomikos.com/Documentation/TomcatIntegration)  
  [http://layered.tistory.com/entry/Atomikos-37-Spring31-Tomcat7-Integration](http://layered.tistory.com/entry/Atomikos-37-Spring31-Tomcat7-Integration)

- 분산 트랜잭션을 지원하는 UserTransaction Factory 클래스를 정의

  그러나 Spring3.x 버전부터 jotm 관련 소스가 drop 됨 [http://forum.spring.io/forum/spring-projects/data/71824-jotmfactorybean-in-spring-3-rc1](http://forum.spring.io/forum/spring-projects/data/71824-jotmfactorybean-in-spring-3-rc1)

여기서는 분산트랜잭션을 제공하는 컨테이너가 없다고 가정하고  
spring 4.0.x 에서 JOTM 을 이용하여 분산 트랜잭션 처리 방법을 살펴보고자한다

## 작업순서

1. JOTM 등 관련 라이브러리 추가 (maven)
1. UserTransaction Factory 클래스 작성
1. DataSource 및 TransactionManager 정의

## 작업방법

JOTM 등 필요 라이브러리 추가 (maven)

```
<dependency><groupId>javax.transaction</groupId><artifactId>jta</artifactId><version>1.1</version></dependency>
<dependency><groupId>jotm</groupId><artifactId>jotm</artifactId><version>2.0.10</version>
	<exclusions>
		<exclusion><groupId>javax.resource</groupId><artifactId>connector</artifactId></exclusion>
	</exclusions>
</dependency>
<dependency><groupId>javax.resource</groupId><artifactId>connector-api</artifactId><version>1.5</version></dependency>

<dependency><groupId>com.experlog</groupId><artifactId>xapool</artifactId><version>1.5.0</versionv</dependency>
```

User Transaction Factory 클래스 JotmFactoryBean

```
package kr.itnp.springbatch.samples;

import javax.naming.NamingException;  
import javax.transaction.SystemException;  
  
import org.objectweb.jotm.Current;  
import org.objectweb.jotm.Jotm;  
  
import org.springframework.beans.factory.DisposableBean;  
import org.springframework.beans.factory.FactoryBean;  

public class JotmFactoryBean implements FactoryBean, DisposableBean {  
  
    private Current jotmCurrent;  
  
    private Jotm jotm;  
  
    public JotmFactoryBean() throws NamingException {  
        // Check for already active JOTM instance.  
        this.jotmCurrent = Current.getCurrent();  
  
        // If none found, create new local JOTM instance.  
        if (this.jotmCurrent == null) {  
            // Only for use within the current Spring context:  
            // local, not bound to registry.  
            this.jotm = new Jotm(true, false);  
            this.jotmCurrent = Current.getCurrent();  
        }  
    }  
  
    public void setDefaultTimeout(int defaultTimeout) {  
        this.jotmCurrent.setDefaultTimeout(defaultTimeout);  
        // The following is a JOTM oddity: should be used for demarcation  
        // transaction only,  
        // but is required here in order to actually get rid of JOTM's default  
        // (60 seconds).  
        try {  
            this.jotmCurrent.setTransactionTimeout(defaultTimeout);  
        } catch (SystemException ex) {  
            // should never happen  
        }  
    }  
  
    public Jotm getJotm() {  
        return this.jotm;  
    }  
  
    public Object getObject() {  
        return this.jotmCurrent;  
    }  
  
    public Class getObjectType() {  
        return this.jotmCurrent.getClass();  
    }  
  
    public boolean isSingleton() {  
        return true;  
    }  
  
    public void destroy() {  
        if (this.jotm != null) {  
            this.jotm.stop();  
        }  
    } 
}
```

DataSource 및 TransactionManager 정의

```
<bean id="jotm" class="kr.itnp.springbatch.samples.JotmFactoryBean" />    
  <bean id="ds-one" class="org.enhydra.jdbc.pool.StandardXAPoolDataSource" destroy-method="shutdown">
	<property name="dataSource">
  <bean class="org.enhydra.jdbc.standard.StandardXADataSource" destroy-method="shutdown">
	<property name="transactionManager" ref="jotm" />
	<property name="driverName" value="org.postgresql.Driver" />
	<property name="url" value="jdbc:postgresql://server-one:5432/dbname" />
  </bean>
    </property>
    <property name="user" value="user-one" />
    <property name="password" value="password-one" />
  </bean>
  <bean id="ds-two" class="org.enhydra.jdbc.pool.StandardXAPoolDataSource" destroy-method="shutdown">
    <property name="dataSource">
      <bean class="org.enhydra.jdbc.standard.StandardXADataSource" destroy-method="shutdown">
        <property name="transactionManager" ref="jotm" />
        <property name="driverName" value="org.postgresql.Driver" />
        <property name="url" value="jdbc:postgresql://server-two:5432/dbname" />
      </bean>
    </property>
    <property name="user" value="user-two" />
    <property name="password" value="password-two" />
  </bean>
  <bean id="txManager" class="org.springframework.transaction.jta.JtaTransactionManager" p:userTransaction-ref="jotm" />
  <tx:annotation-driven transaction-manager="txManager"/>
```


"jotm"(1라인) : UserTransaction Factory 클래스를 정의  
"ds-one"(2라인), "ds-two"(13라인) : org.enhydra.jdbc.pool.StandardXAPoolDataSource 를 사용하여 2개의 DataSource 정의  
"txManager"(24라인) : org.springframework.transaction.jta.JtaTransactionManager 정의하고 "jotm" 대입  
앞서 정의한 "txManager" 를 tx:annotation-driven 를 지정(25라인) 함


## 사용

Service, Dao 클래스에서는 @Transactional annotation 을 사용하여 트랜잭션 처리하도록 함

```
@Transactional(propagation = Propagation.REQUIRED, rollbackFor = Throwable.class)

public void importBulk() { ...
```