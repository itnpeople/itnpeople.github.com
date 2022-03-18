---
title:  Cloud Providers
date:   2022/03/18 9:42
categories: "tip"
tags: ["kubernetes","csp", "aws", "gcp", "azure"]
keywords: ["kubernetes","csp", "aws", "gcp", "azure"]
description: Development Tips - Cloud Providers
---

# {{ page.title }}

**Table of Contents**

* [AWS](#aws)
* [GCP](#gcp)
* [Azure](#azure)

## AWS

```
▒ aws configure                                            # cli 연결정보 설정

▒ aws ec2 describe-security-groups                         # security group 조회
▒ aws ec2 describe-vpcs --vpc-ids=vpc-0fb1ad52551f100a1    # vpc 아이로 조회
```

### Profile

```
aws configure --profile seoul 
```

### AMI

* AMI 조회

```
▒ aws ec2 describe-images
▒ aws ec2 describe-images --owners self amazon 
```

* 현재 region 에서 `Canonical` 의 `ubuntu-bionic-18.04-amd64-server` 이미지 아이디 조회
  * 099720109477:Canonical

```
#  현재 Amazon Linux 2 AMI 검색
▒  aws ec2 describe-images --owners '099720109477' \
    --filters 'Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*' 'Name=virtualization-type,Values=hvm' \
    --output text

# 싱가폴 리전에서 생성일 최신 기준 ID 조회
▒  aws ec2 describe-images --owners '099720109477' --region 'ap-southeast-1'\
    --filters 'Name=name,Values=*ubuntu-bionic-18.04-amd64-server-*' \
    --filters 'Name=virtualization-type,Values=hvm' \
    --query 'reverse(sort_by(Images, &CreationDate))[:1].ImageId'

▒  aws ec2 describe-images --owners self amazon --region 'ap-southeast-1'\
    --filters 'Name=name,Values=*ubuntu-bionic-18.04-amd64-server-*' \
    --filters 'Name=virtualization-type,Values=hvm' \
    --query 'reverse(sort_by(Images, &CreationDate))[:1].ImageId'


```

### Elastic Load Balancing 
* Application Load Balancer : L7, HTTP, HTTPS, gRPC
* Network Load Balancer : L4, TCP, UDP, TLS
* Gateway Load Balancer : L3 + L4 LB, IP
* Classic Load Balancer : L4/, TCP, SSL/TLS, HTTP, HTTPS
* [제품 비교](https://aws.amazon.com/ko/elasticloadbalancing/features/#Product_comparisons)

## GCP

```
# 이미지 조회
▒ gcloud compute images list --filter="family:ubuntu"

# machine type 확인
▒ gcloud compute machine-types list --filter="zone:asia-northeast3"

# service acoount 확인
▒ gcloud iam service-accounts list

# region 목록 (https://cloud.google.com/compute/docs/regions-zones?hl=ko)
▒ gcloud compute regions list

# region 정보
▒ gcloud compute regions describe us-central1
```

## Azure

* credential

```
▒ az login
▒ az ad sp create-for-rbac --sdk-auth > credentials
```

* region list

```
▒ az account list-locations -o table
```