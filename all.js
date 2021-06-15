modList = document.getElementById("modList")
content = document.getElementById("content")
filter = document.getElementById("filter")
order = document.getElementById("order")
mods = []
lastClicked = null
sortWord = null
sortWordDiv = document.getElementById("sortWord")
filterStrings = ['title', 'description', 'summary', 'author', 'last_edited', 'mod_version', 'LT_version']
filterArrays  = ['types', 'tags']
//add non-git mod JSON url's to this array to test them
var modJSONS = []

sorts = function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()) > 0 }

orderClicked = function(){
    if(order.children[0].classList.contains("activeOrder")){
        order.children[0].classList.remove("activeOrder")
        order.children[0].setAttribute("onclick","orderClicked()")
        order.children[1].classList.add("activeOrder")
        order.children[1].setAttribute("onclick","")
        sorts = function(a, b) { return b.toLowerCase().localeCompare(a.toLowerCase()) > 0 }
    }else{
        order.children[0].classList.add("activeOrder")
        order.children[0].setAttribute("onclick","")
        order.children[1].classList.remove("activeOrder")
        order.children[1].setAttribute("onclick","orderClicked()")
        sorts = function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()) > 0 }
    }
    sortMods()
}

sortWordClicked = function(key, key2){
    if(!key2)key2 = key
    sortWordDiv.innerHTML = key2
    sortWord = key
    sortMods()
}

swapIndexes = function(pos1, pos2){
    var tmp = mods[pos1]
    mods[pos1] = mods[pos2]
    mods[pos2] = tmp
    var cld1 = modList.childNodes[pos1]
    var cld2 = modList.childNodes[pos2]
    tmp = cld1.nextElementSibling
    modList.insertBefore(cld1, cld2.nextElementSibling)
    modList.insertBefore(cld2, tmp)
    tmp = cld1.onclick
    cld1.onclick = cld2.onclick
    cld2.onclick = tmp
}

sortMods = function(){
    if(sortWord){
        lastClicked = null
        content.innerHTML = ""
        var size = mods.length
        for(var sorted = 0;sorted < size - 1;sorted++){
            var largest = sorted
            for (var unsorted = sorted + 1;unsorted < size;unsorted++){
                if (sorts(mods[largest][sortWord], mods[unsorted][sortWord])) largest = unsorted
            }
            if (largest != sorted) swapIndexes(largest, sorted)
        }
    }
}

filterEntries = function(){
    var regex = [['all', filter.value]]
    
    mods.forEach((mod, index) => {
        var passedList = []
        filterStrings.forEach(fString => {
            var matches = []
            if(mod[fString]){
                mod[fString] = mod[fString].replaceAll("<match>", "").replaceAll("</match>", "")
                regex.forEach((rule, rIndex) => {
                    var reg = new RegExp(rule[1], 'i')
                    if(rule[0] == 'all' || rule[0] == fString) {
                        var match = mod[fString].match(reg)
                        if(match){
                            passedList[rIndex] = true
                            matches.push(match)
                        }
                    }
                })
            }
            var text = mod[fString]
            matches.sort(function(first, second){first.index > second.index})
            matches.forEach(item => {text = text.substr(0, item['index']) + "<match>" + item[0] + "</match>" + text.substr(item['index'] + item[0].length)})
            mod[fString] = text
            var node = modList.children[index].getElementsByClassName(fString)[0]
            if(node)node.innerHTML = text
            if(index === lastClicked) {
                node = content.getElementsByClassName(fString)[0]
                if(node) node.innerHTML = text
            }
        })
        filterArrays.forEach(fArray => {
            if(mod[fArray]){
                mod[fArray].forEach((string, mIndex) => {
                    string = string.replaceAll("<match>", "").replaceAll("</match>", "")
                    var matches = []
                    regex.forEach((rule, rIndex) => {
                        var reg = new RegExp(rule[1], 'i')
                        if(rule[0] == 'all' || rule[0] == fArray) {
                            var match = string.match(reg)
                            if(match){
                                passedList[rIndex] = true
                                matches.push(match)
                            }
                        }
                    })
                    matches.sort(function(first, second){first.index > second.index})
                    matches.forEach(item => {string = string.substr(0, item['index']) + "<match>" + item[0] + "</match>" + string.substr(item['index'] + item[0].length)})
                    mod[fArray][mIndex] = string
                    if(index === lastClicked) {
                        var node = content.getElementsByClassName(fArray)[mIndex]
                        if(node) node.innerHTML = string
                    }
                })
            }
        })
        if(passedList.every(item => {item == true})) modList.childNodes[index].style.display = "none"
        else modList.childNodes[index].style.display = ""
    })
}

modClicked = function(index){
    content.innerHTML = ""
    lastClicked = index

    // manage selected effect
    var list = document.getElementsByClassName("activeMod")
    for (var i = 0; i < list.length; i++) {
        if (list[i] == modList.childNodes[index]){
            // mod is deselected, show nothing
            list[i].classList.remove("activeMod")
            return
        }
        list[i].classList.remove("activeMod")
    }
    modList.childNodes[index].classList.add("activeMod")
    item = mods[index]

    // define sub-structures
    var images = ""
    if(item.images && item.images.length > 0){
        images += "<imgscroll>"
        item.images.forEach(src => images += "<imgbox><img src='" + src + "'></imgbox>")
        images += "</imgscroll>"
    }

    var info =
        "<divider><p>Info</p><cloud>"
            + "<li>Author : <span class='author'>" + item.author
            + "</span></li><li>last edited : <span class='last_edited'>" + item.last_edited
            + "</span></li><li>mod version : <span class='mod_version'>" + item.mod_version
            + "</span></li><li>Game version : <span class='LT_version'>" + item.LT_version
        + "</span></li></cloud></divider>"

    var types = "<divider><p>Types</p><cloud>"
    item.types.forEach(type => types += "<li class='types'>" + type + "</li>")
    types += "</cloud></divider>"

    var tags = ""
    if(item.tags && item.tags.length > 0){
        tags += "<divider><p>Tags</p><cloud>"
        item.tags.forEach(tag => tags += "<li class='tags'>" + tag + "</li>")
        tags += "</cloud></divider>"
    }

    // define main structure
    content.innerHTML
        = "<h1 class='title'>" + item.title + "</h1>"
        + "<a href = '" + item.url + "', target = '_blank', rel = 'noreferrer noopener'>Download</a>"
        + images
        + "<cloud class='description'>" + item.description + "</cloud>"
        + info
        + types
        + tags
}

generateModList = function(){
    mods.forEach((item, index) => {
        // get variables
        var summary = ""
        if(item.summary) summary = "summary'>" + item.summary
        else if (item.description) summary = "description'>" + item.description

        var cover = ""
        if(item.cover) cover = item.cover
        else if(item.images[0]) cover = item.images[0]
        else cover = "https://raw.githubusercontent.com/Innoxia/liliths-throne-public/master/src/com/lilithsthrone/res/UIElements/menu.svg"

        // assemble list item
        modList.innerHTML += 
        "<div onclick='modClicked(" + index + ")'>"
            + "<p class='title'>" + item.title + "</p>"
            + "<cloud>"
                + "<summary class='" + summary + "</summary>"
                + "<imgbox><img src='" + cover + "'></imgbox>"
            + "</cloud>"
        + "</div>"
    })
}

exceededView = function(){
    content.innerHTML = "You refreshed the page too many times. Come back when you've cooled down."
}

var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                JSON.parse(xhttp.responseText).tree.forEach(item => modJSONS.push(item.path));
                let modJSONSSize = modJSONS.length;
                modJSONS.forEach(item => {
                    var xhttp = new XMLHttpRequest();
                    xhttp.onreadystatechange = function() {
                        if (this.readyState == 4 && this.status == 200) {
                            try {
                                var mod = JSON.parse(this.responseText);
                                mod.title = item.substr(0, item.length - 5).replaceAll("_", " ");
                                if (!mod.url || !mod.description || !mod.author || !mod.last_edited || !mod.mod_version || !mod.LT_version || !mod.types) {
                                    console.log("Skipped " + item + " because of missing required fields");
                                    modJSONSSize--;
                                } else {
                                    mods.push(mod);
                                }
                            } catch (e) {
                                if (e instanceof SyntaxError) {
                                    console.log("Skipped " + item + " because of a syntax error");
                                    modJSONSSize--;
                                } else {
                                    throw e;
                                }
                            } finally {
                                if (mods.length == modJSONSSize) generateModList();
                            }
                        }
                    };
                    xhttp.open("GET", "mods/" + item, true);
                    xhttp.send();
                });
            } else if(this.status == 403) exceededView()
        };
        var tree =  JSON.parse(this.responseText).tree
        var url = ""
        for(index in tree){
            if(tree[index].path == "mods"){
                url = tree[index].url
                break
            }
        }
        xhttp.open("GET", url, true);
        xhttp.send();
    } else if(this.status == 403) exceededView()
};
xhttp.onerror = exceededView
xhttp.open("GET", "https://api.github.com/repos/commit-man/liliths-mods/git/trees/master", true);
xhttp.send();
