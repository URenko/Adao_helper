// ==UserScript==
// @name        A岛网页版增强脚本
// @namespace   nimingban
// @icon        https://i.loli.net/2020/03/19/htoIEsGnXz8LukQ.png
// @match       *://adnmb2.com/f/*
// @match       *://adnmb2.com/t/*
// @match       *://tnmb.org/f/*
// @match       *://tnmb.org/t/*
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @version     1.0
// @author      337845818
// @description A岛网页版增强脚本（自动加载、板块屏蔽、永久屏蔽……）
// ==/UserScript==

const block_section = new Set(["跑团","围炉"]);

console.log('光来！');
const isF = document.location.pathname.startsWith('/f');  //是板块吗
const isT = decodeURI(document.location.pathname) == "/f/时间线";  //是时间线吗
const list_class = isF ? '.h-threads-list' : '.h-threads-item-replys';
const item_class = isF ? '.h-threads-item' : '.h-threads-item-reply';
let loadblock = false; //正在加载or最后一页为true
let loadmode = GM_getValue('loadmode', true); //true为开启自动加载
console.log('loadmode:', loadmode)
try{
  PermBlock_list = JSON.parse(GM_getValue('PermBlock', "[]"));
}catch(e){
  console.error(e)
  GM_deleteValue('PermBlock');
  PermBlock_list = [];
}
console.log('永久屏蔽列表：', PermBlock_list);

const PermBlock_html = '<span class="h-threads-info-report-btn">[<a onclick="PermBlock(this);">永久屏蔽</a>]</span>';

loadmore = function(page_now){
  //自动加载
  
  console.log('少女祈祷中...');
  if(undefined === page_now){
    page_now = Number($('.uk-active')[0].textContent);
  }
  console.log(`现在是第${page_now}页`);
  
  //已读串
  let old_threads = new Set();
  for (const thread_item of document.querySelectorAll(item_class)){
    old_threads.add(thread_item.getAttribute('data-threads-id'));
  }  
  
  //加载图标
  $('.uk-pagination').empty();
  let img1 = document.createElement("img");
  img1.src = "https://i.loli.net/2020/03/19/9W3Frt1sVleKZDA.gif";
  let img2 = document.createElement("img");
  img2.src = "https://nmbimg.fastmirror.org/image/2015-11-10/5640c3ffe84d0.gif";
  let img3 = document.createElement("img");
  img3.src = "https://nmbimg.fastmirror.org/image/2020-03-15/5e6d1a1136bca.gif";
  $('.uk-pagination')[0].append(img3,img2,img1);
  
  //加载下一页
  fetch(document.location.pathname+'?page='+(page_now+1))
    .catch(error => {
      console.error('Error:', error);
      $('.uk-pagination').html(`<li onclick='loadmore(${page_now});'><a>加载失败，点击刷新</a></li>`);
    })
    .then(response => response.text())
    .then(text => {
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(text, "text/html");
    for (const item of htmlDocument.documentElement.querySelectorAll(item_class)){
      let id = item.getAttribute('data-threads-id');
      if((isT && block_section.has(item.getElementsByTagName("spam")[0].innerText)) || (isF && PermBlock_list.includes(item.getAttribute("data-threads-id")))){
        continue; // 屏蔽板块&永久屏蔽的作用↑
      }
      if(isF){  //添加永久屏蔽选项
        item.getElementsByClassName('h-threads-info-report-btn')[1].insertAdjacentHTML('afterend', PermBlock_html);
      }
      if (!old_threads.has(id)){
        $(list_class).append(item);
        if(isF){
          $(list_class).append('<hr>');
        }
      }else{
        console.log('已读：'+id);
      }
    }
    
    //恢复页码
    $('.uk-pagination').replaceWith(htmlDocument.documentElement.querySelector('.uk-pagination'));
    //检查是否最后一页
    if($('.uk-disabled').text().includes("下一页")){
      $('.uk-pagination').html(`<li onclick='loadmore(${page_now});'><a>已是最后一页，点击刷新</a></li>`);
      return;
    }
    
    loadblock = false;
  })
};

$(window).scroll(function(){
  // 到底了
  if (loadmode && !loadblock && ($(window).scrollTop() + $(window).height() + 20 > $(document).height())) {
    loadblock = true;
		loadmore();
	}
});

//只有第一页不自动启动
if($('.uk-disabled').text().includes("下一页")){
  loadblock = true;
  $('.uk-pagination').html(`<li onclick='loadmore(1);'><a>已是最后一页，点击刷新</a></li>`);
}

//切换按钮
switchmode = function(){
  loadmode = !loadmode;
  $('.h-tool-btn[title="开启/关闭自动加载"]').css('filter',`grayscale(${loadmode ? 0 : 1})`);
  GM_setValue('loadmode', loadmode);
}
$('.h-tool-btn[title="刷新"]').after('<span title="开启/关闭自动加载" onclick="switchmode();" class="h-tool-btn"><img src="https://i.loli.net/2020/03/19/9W3Frt1sVleKZDA.gif"></span>');
$('.h-tool-btn[title="开启/关闭自动加载"]').css('filter',`grayscale(${loadmode ? 0 : 1})`);

// 屏蔽板块&永久屏蔽的作用
if(isF){
  for(item of document.querySelectorAll('.h-threads-item')){
    if((isT && block_section.has(item.getElementsByTagName("spam")[0].innerText)) || PermBlock_list.includes(item.getAttribute("data-threads-id"))){
      item.nextElementSibling.remove();
      item.remove();
    }
  }
}


//设置永久屏蔽
if(isF){
  PermBlock = function(targ){
    const parent = targ.parentNode.parentNode.parentNode.parentNode;
    const id = parent.getAttribute("data-threads-id");
    PermBlock_list.push(id);
    GM_setValue('PermBlock', JSON.stringify(PermBlock_list));
    alert('已永久屏蔽№'+id);
    parent.nextElementSibling.remove();
    parent.remove();
  };
  $(".h-threads-info-report-btn:contains('订阅')").after(PermBlock_html);
}

//清除永久屏蔽
cleanPermBlock = function(){
  GM_deleteValue('PermBlock');
  console.log('已清除', PermBlock_list);
  PermBlock_list = [];
};



