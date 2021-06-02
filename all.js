modList = document.getElementById("modList")
content = document.getElementById("content")
filter = document.getElementById("filter")
mods = []
//add non-git mod JSON url's to this array to test them
var modJSONS = []

hasRegex = function(dict, regex){
    for (key in dict) {
        if(Array.isArray(dict[key])){
            for(string in dict[key]){
                if(string.match(regex)) return true
            }
        }
        else if(dict[key].match(regex)) return true
    }
    return false
}

filterEntries = function (){
    var regex = filter.value
    mods.forEach((mod, index) =>{
        if(!regex || hasRegex(mod, regex)) modList.childNodes[index].style.display = ""
        else modList.childNodes[index].style.display = "none"
    })
}

modClicked = function(index){
    // manage selected effect
    var list = document.getElementsByClassName("active")
    content.innerHTML = ""
    for (var i = 0; i < list.length; i++) {
        if (list[i] == modList.childNodes[index]){
            // mod is deselected, show nothing
            list[i].classList.remove("active")
            return
        }
        list[i].classList.remove("active")
    }
    modList.childNodes[index].classList.add("active")
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
            + "<li>Author:           " + item.author.replaceAll("<", "&lt;")
            + "</li><li>last edited:  " + item.last_edited.replaceAll("<", "&lt;")
            + "</li><li>mod version:  " + item.mod_version.replaceAll("<", "&lt;")
            + "</li><li>Game version: " + item.LT_version.replaceAll("<", "&lt;")
        + "</li></cloud></divider>"

    var types = "<divider><p>Types</p><cloud>"
    item.types.forEach(type => types += "<li>" + type + "</li>")
    types += "</cloud></divider>"

    var tags = ""
    if(item.tags && item.tags.length > 0){
        tags += "<divider><p>Tags</p><cloud>"
        item.tags.forEach(tag => tags += "<li>" + tag + "</li>")
        tags += "</cloud></divider>"
    }

    // define main structure
    content.innerHTML
        = "<h1>" + item.title + "</h1>"
        + "<a href = '" + item.url + "', target = '_blank', rel = 'noreferrer noopener'>Download</a>"
        + images
        + "<cloud>" + item.description + "</cloud>"
        + info
        + types
        + tags
}

generateModList = function(){
    mods.forEach((item, index) => {
        // get variables
        var summary = ""
        if(item.summary) summary = item.summary
        else if (item.description) summary = item.description

        var cover = ""
        if(item.cover) cover = item.cover
        else if(item.images[0]) cover = item.images[0]
        else cover = "https://raw.githubusercontent.com/Innoxia/liliths-throne-public/master/src/com/lilithsthrone/res/UIElements/menu.svg"

        // assemble list item
        modList.innerHTML += 
        "<div onclick='modClicked(" + index + ")'>"
            + "<p>" + item.title + "</p>"
            + "<cloud>"
                + "<summary>" + summary + "</summary>"
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
        xhttp.onerror = exceededView()
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
            }
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
    }
};
xhttp.onerror = exceededView()
xhttp.open("GET", "https://api.github.com/repos/commit-man/liliths-mods/git/trees/master", true);
xhttp.send();
