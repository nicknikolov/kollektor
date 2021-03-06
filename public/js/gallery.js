var startImageIndex = 0;
var maxImagesLimit = 50;
var thumbWidth = 300;
var columnMargin = 10;
var columnWidth = thumbWidth + columnMargin;
var columns = [];
var imagesData;

var images = [];

String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};

function buildColumns() {
  var w = document.body.clientWidth;
  var numColumns = Math.floor(w/columnWidth);
  for(var i=0; i<numColumns; i++) {
    var column = {
      height: 0
    }
    column.div = $('<div class="column"></div>');
    $(document.body).append(column.div);
    columns.push(column);
  }
}

function findColumn() {
  var min = 99999999;
  var mini = 0;
  for(var i=0; i<columns.length; i++) {
    if (columns[i].height < min) {
      min = columns[i].height;
      mini = i;
    }
  }

  return columns[mini];
}


function selectElement(element) {
  var range = document.createRange();
  var sel = window.getSelection();
  range.setStart(element.get(0), 1);
  //range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function makeContentEditable(element, onStart, onEnd) {
  var preventClick = false;
  var preventTimeout = 0;
  element.mousedown(function(e) {
    preventTimeout = setTimeout(function() {
      preventClick = true;
      preventTimeout = 0;
      element.attr("contenteditable", "true");
      element.addClass("contentEditable");
      onStart();
    }, 500)
  });

  element.mouseup(function(e) {
    if (preventTimeout) {
      clearTimeout(preventTimeout);
      preventTimeout = 0;
      preventClick = false;
    }
  });

 element.keydown(function(e) {
   var finishEditing = false;
   var success = false;

   if(e.keyCode == 13) { //ENTER
     finishEditing = true;
     success = true;
   }
   else if (e.keyCode == 27) { //ESCAPE
     finishEditing = true;
   }

   if (finishEditing) {
     element.attr("contenteditable", "false");
     element.removeClass("contentEditable");
     element.blur();
     onEnd(success);
   }

   //e.preventDefault();
   //e.stopPropagation();
 });

  element.click(function(e) {
    if (preventClick) {
      e.preventDefault()
    }
  });
}

function updateImageData(params) {
  var request = "/api/update"
  request += "?";
  for(var paramName in params) {
     request += paramName + "=" + encodeURIComponent(params[paramName]) + "&";
  }

   $.get(inspiration_server + request, function(data) {
     console.log("data", data);
   });
}


// imageInfo {}
// cachedUrl: "content/"plugins
// orignalUrl: ""
// referer: "http://haveamint.com/images/screenshots/mint-max-1680x1050.gif"
// tags: "gui,webapp"
// thumbUrl: "content/gui,webapp-4416270ffe79a39ca6ad6feb991cb92e_h.jpg"
// title: "Mint"
function addImage(imgInfo, prepend) {
  var wrapper = $('<div class="imageWrapper"></div>');

  var link = $('<a href="' + inspiration_server + "/images/"+ imgInfo.cachedUrl + '"></a>');
  var image = new Image();
  link.append(image);
  wrapper.append(link);

  var overlay = $('<div class="overlay"></div>');
  wrapper.append(overlay);

  function extractHost(url) {
    if (!url || url == "") return "Unknown";
    var slashPosition = url.indexOf("/", url.indexOf("//") + 3);
    if (slashPosition == -1) slashPosition = url.length;
    return url.substr(0, slashPosition);
  }

  //URL

  var refererTag = '<a href="{0}" class="refererLink"><h5>{1}</h5></a>';
  var refererUrl = imgInfo.referer ? imgInfo.referer : "Unknown"
  var referer = $(refererTag.format(refererUrl, extractHost(imgInfo.referer)));
  overlay.append(referer);

  makeContentEditable(
    referer,
    function() {
      var refererUrl = referer.attr("href");
      referer.data("oldreferer", refererUrl)
      referer.find("h5").html(refererUrl);
      selectElement(referer.find("h5"));
    },
    function(success) {
      if (success) {
        var newReferer = referer.find("h5").text();
        console.log("Saving new referer...", newReferer, "for image", imgInfo.id);
        updateImageData({
          id: imgInfo.id,
          referer: newReferer
        })
        referer.attr("href", newReferer);
        title.attr("href", newReferer);
        referer.find("h5").html(extractHost(newReferer));
      }
      else {
        referer.find("h2").text(extractHost(referer.data("oldtitle")));
      }
      referer.data("oldtitle", "");
    }
  );

  //TITLE

  var titleTag = '<a href="{0}" class="titleLink"><h2>{1}</h2></a>';
  var title = $(titleTag.format(imgInfo.referer, imgInfo.title));
  overlay.append(title);

  makeContentEditable(
    title,
    function() {
      title.data("oldtitle", title.find("h2").text())
      selectElement(title.find("h2"));
    },
    function(success) {
      if (success) {
        var newTitle = title.find("h2").text();
        console.log("Saving new title...", newTitle, "for image", imgInfo.id);
        updateImageData({
          id: imgInfo.id,
          title: newTitle
        })

      }
      else {
        title.find("h2").text(title.data("oldtitle"));
      }
      title.data("oldtitle", "");
    }
  );

  //TAG LINKS

  function refreshImage() {

  }

  function deleteImage() {
    if (!confirm("Are you sure to delete " + imgInfo.title)) {
      return false;
    }
    $.get(inspiration_server + "/api/delete?imageId=" + imgInfo.id, function(result) {
      if (!result.err) {
        wrapper.slideUp();
      }
    });
    return false;
  }

  var linksWrapper = $('<div class="linksWrapper"></div>');

  function tagsToLinks(tags) {
    var numLinks = 0;
    linksWrapper.html("");
    $(tags)
    //.filter(function(tag) { return this.indexOf('p-') !== 0; })
    .each(function() {
      var tag = this;
      if (numLinks++ > 0) linksWrapper.append(", ");
      var tagLink = $('<a href="'+inspiration_server+'/tag/'+tag+'">'+tag+'</a>');
      tagLink.click(function(e) {
        if (e.shiftKey) {
          e.preventDefault();
          if (document.location.href.indexOf("/tag/") > 0) {
            document.location.href = document.location.href + "+" + tag;
          }
          else {
            document.location.href = tagLink.attr("href");
          }
        }
      })
      linksWrapper.append(tagLink);
    })

    var refreshLink = $('<a href="#" class="optionsLink">refresh</a>');
    refreshLink.click(refreshImage);

    var deleteLink = $('<a href="#" class="optionsLink">delete</a>');
    deleteLink.click(deleteImage);
    //var complexityLink = $('<a href="'+inspiration_server+'/complexity/'+imgInfo.complexity+'">' + imgInfo.complexity +'</a>');
    //var idLink = $('<a href="#">#' + imgInfo.id +'</a>');

    //linksWrapper.append(", ", refreshLink, ", ", deleteLink, ',', complexityLink, ',', idLink);
    linksWrapper.append(", ", refreshLink, ", ", deleteLink);
  }

  tagsToLinks(imgInfo.tags);
  overlay.append(linksWrapper);

  //OPTIONS

  //var optionsWrapper = $('<div class="optionsWrapper"></div>')
  //overlay.append(optionsWrapper);
  //
  //var deleteLink = $('<a href="#" class="deleteLink"></a>');
  //optionsWrapper.append(deleteLink);
  //
  //var refreshLink = $('<a href="#" class="refreshLink"></a>');
  //optionsWrapper.append(refreshLink);

  function cleanTagText(text) {
    return text.replace(/^\s+/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').replace(/\s+$/, '');
  }

  makeContentEditable(
    linksWrapper,
    function() {
      linksWrapper.find(".optionsLink").remove();
      linksWrapper.data("oldtags", linksWrapper.text());
      linksWrapper.html(cleanTagText(linksWrapper.text()));
      selectElement(linksWrapper);
    },
    function(success) {
      var tags;
      if (success) {
        tags = cleanTagText(linksWrapper.text()).split(' ');
        console.log("Saving new tags...", tags, "for image", imgInfo.id);
        updateImageData({
          id: imgInfo.id,
          tags: tags.join(",")
        })
      }
      else {
        tags = cleanTagText(linksWrapper.data("oldtags")).split(' ');
      }
      tagsToLinks(tags);

      linksWrapper.data("oldtags", "");
    }
  );

  //IMAGE

  $(image).attr("data-src", "/images/" + imgInfo.thumbUrl);
  $(image).attr("src", "/images/" + imgInfo.thumbUrl);
  if (prepend) {
    wrapper.hide();
    $(image).attr("src", "/images/" + imgInfo.thumbUrl);
    setTimeout(function() {
      wrapper.slideDown();
    }, 1000)
  }

  var width = thumbWidth;
  var height = width / imgInfo.ratio;
  wrapper.css("height", height);
  var column = findColumn();

  if (prepend)
    column.div.prepend(wrapper);
  else
    column.div.append(wrapper);
  column.height += height;

  image.width = width;
  image.height = width / imgInfo.ratio;

  //PLUGINS

//  image.onload = function() {
//    console.log('Image loaded ' + inspirationPlugins.length)
//    inspirationPlugins.forEach(function(plugin, i) {
//      if (!window.once) window.once = 0;
//      if (window.once++ < 5) {
//        window.once = true;
//        if (!imgInfo.plugindata || !(plugin.name in imgInfo.plugindata)) {
//          console.log('Running', plugin.name, 'on', imgInfo);
//          plugin.run(imgInfo, image, linksWrapper);
//        }
//      }
//    })
//  }

    image.onload = function() {
      images.push({
        imgInfo: imgInfo,
        image: image,
        linksWrapper: linksWrapper
      })
    }
}

function runPlugin(name) {
    console.log('runPlugin', name);
  inspirationPlugins.forEach(function(plugin, i) {
    if (plugin.name != name) return;

    var todo = images.slice(0);

    function next() {
        var img = todo.shift();
        if (!img) { return; }

        var imgInfo = img.imgInfo;
        var image = img.image;
        var linksWrapper = img.linksWrapper;
        if (!imgInfo.plugindata || !(plugin.name in imgInfo.plugindata)) {
          console.log('Running', plugin.name, 'on', imgInfo);
          plugin.run(imgInfo, image, linksWrapper, next);
        }
        else {
            next();
        }
    }

    next();
  })
}

function buildDropZone() {
  var xhr = new XMLHttpRequest();
  if (!xhr.upload) {
    console.log("XMLHttpRequest2 file upload not available!");
    return;
  }

  function processFile(file) {

    console.log("Uploading", file.name, file.type, file.size);

    var xhr = new XMLHttpRequest();
    if (xhr.upload && (file.type == "image/jpeg" || file.type == "image/gif" || file.type == "image/png")) {
      xhr.open("POST", inspiration_server + "/api/upload");
      var formData = new FormData();
      formData.append("file", file);
      xhr.send(formData);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4){
          var imageData = JSON.parse(xhr.response);
          addImage(imageData, true);
        }
      };
    }
  }

  function processLink(link) {
    console.log("Uploading", link);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", inspiration_server + "/api/post?img="+encodeURIComponent(link));
    xhr.send();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4){
        var imageData = JSON.parse(xhr.response);
        console.log(imageData);
        addImage(imageData, true);
      }
    };
  }

  var dropzone = $('<div id="dropzone"><p>Drop Images Here</p></div>');
  $("body").append(dropzone);

  document.body.addEventListener('dragover', function(e) {
    dropzone.show();
    e.stopPropagation();
    e.preventDefault();
    return false;
  });

  dropzone.get(0).addEventListener('dragleave', function(e) {
    dropzone.hide();
    e.stopPropagation();
    e.preventDefault();
    return false;
  });

  document.body.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();
    dropzone.hide();

    var files = e.target.files || e.dataTransfer.files;
    for(var i=0, f; f = files[i]; i++) {
      processFile(f);
    }

    var link = e.dataTransfer.getData("text/uri-list");
    if (link) {
      processLink(link);
    }
    return false;
  })
}

function startSearch() {
  var searchTerm = '';
  var searchField = document.createElement('div');
  document.body.appendChild(searchField);
  searchField.id = 'search';
  searchField.style.display = 'none';
  searchField.style.left = (window.innerWidth - 500)/2 + 'px';
  window.addEventListener('keydown', function(e) {
    if (e.keyCode == 27) {
      document.body.blur();
      searchTerm = '';
      searchField.textContent = searchTerm;
      e.preventDefault();
      searchField.style.display = 'none';
    }
  });
  window.addEventListener('keypress', function(e) {
    if (e.metaKey || e.ctrlKey) return;
    if (document.activeElement != document.body) return;
    if (e.keyCode == 8) {
      searchTerm = searchTerm.substr(0, searchTerm.length-1);
      searchField.textContent = searchTerm;
    }
    else if (e.keyCode == 13) {
        console.log('searchTerm', searchTerm);
      if (searchTerm[0] == '#') {
        document.location.href = '/tag/' + searchTerm.substr(1);
      }
      else if (searchTerm[0] == '/') {
        var pluginName = searchTerm.substr(1);
        runPlugin(pluginName);
        console.log('runPlugin', name);
        document.body.blur();
        searchTerm = '';
        searchField.textContent = searchTerm;
        e.preventDefault();
        searchField.style.display = 'none';
      }
      else if (searchTerm.length > 0) {
        document.location.href = '/s/' + searchTerm;
      }
    }
    else {
      var c = String.fromCharCode(e.charCode != null ? e.charCode : e.keyCode);
      searchTerm += c;
      searchField.textContent = searchTerm;
      searchField.style.display = 'block';
      e.preventDefault();
    }
  });
}

$(document).ready(function() {
  buildDropZone();
  buildColumns();
  startSearch();

  var path = document.location.pathname || "";

  $.get(inspiration_server + "/api/get" + path, function(data) {
    if (data && data.length > 0) {
      console.log("got! " + data.length);
    }
    else {
      document.querySelector('#dropzone').setAttribute('class','active');
      return;
    }
    imagesData = data;
    if (inspiration_tags) {
      $("h1").append("<span> / " + inspiration_tags + "</span>");
    }

    inspiration_tags = inspiration_tags.split("+");

    if (inspiration_tags.length == 1 && inspiration_tags[0] == "") {
      inspiration_tags = [];
    }

    var index = 0;

    function loadMore() {
      var i =0;
      while(i < maxImagesLimit) {
        if (index > imagesData.length - 1) break;
        //if (i < startImageIndex) continue;
        var tags = imagesData[index].tags;
        var filteredOut = false;
        for(var j=0; j<inspiration_tags.length; j++) {
          if (tags.indexOf(inspiration_tags[j]) == -1) {
            filteredOut = true;
            break;
          }
        }
        if (!filteredOut) {
          addImage(imagesData[index]);
          i++;
        }
        index++;
      }
    }

    loadMore();

    $(window).scroll(function() {
      if($(window).scrollTop() + $(window).height() > $(document).height() - 500) {
       loadMore();
      }
    });
  }, "json")

  console.log("waiting...");
});
