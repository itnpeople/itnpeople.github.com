---
layout: "default"
title : "Categories"
categories: ""
---

<div class="row">
	<div class="col-sm-12"><h1>Categories</h1></div>
</div>

<div class="row">
  	<div class="col-sm-12">
    {% for cate in site.category %}
    <h3><a href="{{site.baseurl}}/posts/{{cate.code}}">{{cate.name}}</a></h3>
    <p>{{cate.desc}}</p>
    {% endfor %}
    </div>
</div>
