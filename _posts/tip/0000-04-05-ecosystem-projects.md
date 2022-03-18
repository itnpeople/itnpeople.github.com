---
title:  Cloud navtive ecosystem projects
date:   2022/03/18 9:42
categories: "tip"
tags: ["kubernetes","cloud"]
keywords: ["kubernetes","cloud"]
description: Development Tips - Cloud navtive ecosystem projects
---

# {{ page.title }}

**Table of Contents**

* [CNCF Projects](#cncf-projects)
* [MetalLB](#metallb)

## CNCF Projects

* https://www.cncf.io/projects/

## MetalLB
> L2

* https://www.youtube.com/watch?v=hJO1nxsB5uY (22:00부터)
* controller - speaker (daemonset) 으로 구성
* configmap 에 ip range 등 config 정의
* 충분히 쓸만하지만 고성능을 위해서는 BGP를 통한 L3 구성하는 것이 좋다고함