// Allow modals to be clicked off of by clicking outside
document.querySelectorAll("dialog").forEach(x => {
  x.onmouseup = y => {
    if (y.target == y.currentTarget) {
      y.currentTarget.close()
    }
  }
})

// Wait a second before showing the login form
setTimeout(() => {
  trust.showModal()
}, 1000)

// Default behavior is to show login form when trying to save profile when not logged in
profile.onsubmit = x => {
  x.preventDefault()
  trust.showModal()
}

// Upload and show avatar progress
avatar.onsubmit = x => {
  x.preventDefault()
  var form = new FormData(x.target)
  if (!form.get("user_id").length) { // If this value is not overwritten (i.e not logged in) then show login form
    trust.showModal()
    return
  }
  var request = new XMLHttpRequest()
  request.open("POST", "/updateprofile")
  document.querySelector(".profile-cancel").onclick = () => request.abort()
  document.querySelector(".profile-upload").removeAttribute("hidden")
  profileError.setAttribute("hidden", true)
  request.upload.onprogress = x => {
    var percent = (x.loaded / x.total) * 100
    var gradient = `linear-gradient(to right, var(--theme-passive) ${percent}%, var(--theme-secondary) 0%)`
    document.querySelector(".profile-upload").style.zIndex = "0"
    document.querySelector(".profile-upload").style.background = gradient
  }
  request.onload = x => {
    document.querySelector(".profile-upload").removeAttribute("style")
    if (x.target.responseText == "pix") {
      if (crop.cropper) crop.cropper.destroy()
      fetch(crop.src, {
        cache: "reload"
      }).then(async response => {
        crop.src = crop.src
        crop.onload = () => {
          new Cropper(crop, {
            aspectRatio: 1,
            viewMode: 2,
            preview: ".profile-mini-thumbnail",
            checkOrientation: true,
            ready() {
              console.log("Avatar updated")
            },
            crop(x) {
              updateAvatar = true
            }
          })
        }
      }).catch(e => {
        alert(e.message)
      })
    } else {
      var error = document.createElement("div")
      error.innerHTML = x.target.responseText
      profileError.textContent = error.querySelector("title").text
      profileError.removeAttribute("hidden")
    }
    avatar.querySelector('[type="file"]').value = ""
  }
  request.onerror = () => {
    document.querySelector(".profile-upload").removeAttribute("style")
    avatar.querySelector('[type="file"]').value = ""
  }
  request.onabort = x => {
    document.querySelector(".profile-upload").removeAttribute("style")
    avatar.querySelector('[type="file"]').value = ""
  }
  request.onreadystatechange = x => {
    if (x.target.status != 200) {
      document.querySelector(".profile-upload").removeAttribute("style")
      avatar.querySelector('[type="file"]').value = ""
    }
  }
  request.send(form)
}

// If the file of the avatar is changed, run the code above
avatar.querySelector('input[type="file"]').onchange = () => {
  avatar.querySelector('button[type="submit"]').click()
}

// Display Barry's Profile Tags modal when the option is clicked
barry.onclick = () => {
  tagsParse.showModal()
}

// If the button to upload from device is clicked, redirect to the actual file input
upload.onclick = () => {
  if (!avatar.querySelector('input[name="user_id"]').value.length) { // If this value is not overwritten (i.e not logged in) then show login form
    trust.showModal()
    return
  }
  avatar.querySelector('input[type="file"]').click()
}

// Convert displayed parameters to their returned value
const valueMap = {
  age: "age",
  gender: "sex",
  location: "loc",
  line: "eline",
  email: "email",
  premium: "exp"
}

// Save the avatar thumbnail
function saveThumb() {
  var box = crop.cropper.getData()
  var payload = {action: "thumb", x0: Math.round(box.x), y0: Math.round(box.y), ts: Math.round(box.width)}
  var form = new FormData()
  for (let x in payload) {
    form.set(x, payload[x])
  }
  var target = Object.fromEntries(form)
  fetch("/updateprofile", {
    method: "POST",
    body: JSON.stringify(target)
  }).then(async response => {
    console.log("Avatar thumbnail updated.")
  }).catch(e => {
    console.log(e)
  })
}

// Variable to check if the avatar thumbnail was changed
var updateAvatar = false

// Get profile information and display them accordingly
async function setFull(form, data) {
  var user_id = avatar.querySelector('input[name="user_id"]').value
  await fetch(`/getprofile/${user_id}`).then(async profile => {
    var full = await profile.json()
    if (data.get("ts") != -1) {
      crop.src = `static/avatars/${user_id.toLowerCase()}.jpg`
      crop.parentNode.removeAttribute("hidden")
      var icon = document.querySelector(".profile-mini-icon")
      if (icon) icon.remove()
      crop.onload = () => {
        new Cropper(crop, {
          aspectRatio: 1,
          viewMode: 2,
          preview: ".profile-mini-thumbnail",
          checkOrientation: true,
          ready() {
            var container = this.cropper.getContainerData()
            var retainWidth = (container.width - this.cropper.imageData.width) / 2
            var retainHeight = (container.height - this.cropper.imageData.height) / 2
            var ratio = this.cropper.imageData.width / this.cropper.imageData.naturalWidth
            var top = (data.get("y0") * ratio) + retainHeight
            var left = (data.get("x0") * ratio) + retainWidth
            var width = data..get("ts") * ratio
            this.cropper.setCropBoxData({top: top, left: left, width: width, height: width})
          },
          crop(x) { // The avatar thumbnail was moved, set that it was changed
            updateAvatar = true
          }
        })
      }
    }
    if (full.profile) document.querySelector(`textarea[name="full_profile"]`).value = full.profile
    if (full.body_bg_col) document.querySelector(`input[name="body_bg_col"]`).value = full.body_bg_col
    if (full.body_col) document.querySelector(`input[name="body_col"]`).value = full.body_col
    if (full.body_a_col) document.querySelector(`input[name="body_a_col"]`).value = full.body_a_col
    if (full.body_bg_img) document.querySelector(`input[name="body_bg_img"]`).value = full.body_bg_img
    if (full.tile) {
      switch (full.tile) {
        case "repeat":
          document.querySelector('input[name="body_tile_d"]').checked = true
          document.querySelector('input[name="body_tile_a"]').checked = true
          break;
        case "repeat-y":
          document.querySelector('input[name="body_tile_d"]').checked = true
          break;
        case "repeat-x":
          document.querySelector('input[name="body_tile_a"]').checked = true
          break;
      }
    }
    document.querySelector(".profile-footer button").removeAttribute("disabled")
  }).catch(e => {
    document.querySelector(".profile-footer button").removeAttribute("disabled")
  })
}

// Set profile information
var warning = {
  set: []
}

function setProfile(data, initial) {
  var detail = ["age", "gender", "location"]
  if (data.get("vrfd") == 0) {
    password.onclick = () => {
      return confirm("Your email is not verified")
    }
  } else {
    password.onclick = null
  }
  for (var x in valueMap) {
    var change = data.get(valueMap[x])
    var input = document.querySelector(`input[name="${x}"]`) || document.querySelector(`textarea[name="${x}"]`)
    if (detail.includes(x)) {
      if (change != "?" && change != "None") input.value = change
    } else {
      input.value = decodeURIComponent(change)
    }
    if (initial) {
      if (detail.includes(x) && (change == "?" || change == "None")) warning.set.push(x)
    }
  }
}

// Log in then retrieve and set the profile information
login.onsubmit = x => {
  x.preventDefault()
  var target = new FormData(x.target)
  target.set("ua", navigator.userAgent)
  var form = Object.fromEntries(target)
  loginError.setAttribute("hidden", true)
  document.querySelector(".login-button").setAttribute("disabled", true)
  fetch("/login", {
    method: "POST",
    body: JSON.stringify(form)
  }).then(async response => {
    var content = await response.text()
    var information = content.split("&").map(x => x.split("="))
    var data = new Map(information)
    if (response.status == 200 && !data.get("error")) {
      login.reset()
      loginError.textContent = "Logged in, loading profile data..."
      loginError.removeAttribute("hidden")
      loginError.style.color = "var(--theme-active)"
      avatar.querySelector('input[name="user_id"]').value = form.user_id
      await setFull(form, data)
      trust.close()
      document.title = `${form.user_id} - ` + document.title
      document.querySelector('input[name="dir"]').checked = data.get("dir") == "checked"
      setProfile(data, true)
      profile.onsubmit = async y => { // Overwrite initial profile updating form submit because now logged in
        y.preventDefault()
        var save = new FormData(y.target)
        var update = Object.fromEntries(save)
        if (update.dir) update.dir = "checked"
        profileError.setAttribute("hidden", true)
        if (warning.set.length) {
          var sure = warning.set.filter(z => update[z].length)
          if (sure.length) {
            var check = confirm(`Setting ${sure.join(", ")} will not allow you to remove them`)
            if (check) {
              warning.set = warning.set.filter(x => !sure.includes(x))
            } else {
              return
            }
          }
        }
        document.querySelector(".profile-footer button").setAttribute("disabled", true)
        if (updateAvatar) await saveThumb()
        await fetch("/updateprofile", {
          method: "POST",
          body: JSON.stringify(update)
        }).then(async updated => {
          var profileUpdated = await updated.text()
          var profileInfo = profileUpdated.split("&").map(x => x.split("="))
          var changes = new Map(profileInfo)
          if (updated.status == 200 && !changes.get("error")) {
            await setFull(update, changes)
            document.querySelector('input[name="dir"]').checked = changes.get("dir") == "checked"
            setProfile(changes)
          } else {
            profileError.textContent = changes.get("error")
            profileError.removeAttribute("hidden")
            document.querySelector(".profile-footer button").removeAttribute("disabled")
          }
        }).catch(e => {
          console.log(e)
          profileError.textContent = "Error occurred in updating profile."
          profileError.removeAttribute("hidden")
          document.querySelector(".profile-footer button").removeAttribute("disabled")
        })
      }
    } else {
      loginError.textContent = data.get("error")
      loginError.removeAttribute("hidden")
      document.querySelector(".login-button").removeAttribute("disabled")
    }
  }).catch(e => {
    console.error(e)
    loginError.textContent = "Error occurred in application."
    loginError.removeAttribute("hidden")
    document.querySelector(".login-button").removeAttribute("disabled")
  })
}

// Convert epoch time to display when premium expired or is going to expire
function displayEpoch(timestamp, reverse) {
  var date = Date.now() / 1000
  var time = {
    now: reverse ? timestamp - date: date - timestamp,
    day: 86400,
    hour: 3600,
    minute: 60
  }
  var result = {
    days: Math.floor(time.now / time.day),
    hours: Math.floor((time.now % time.day) / time.hour),
    minutes: Math.floor((time.now % time.hour) / time.minute),
    seconds: Math.floor(time.now % time.minute)
  }
  var convert = Object.keys(result).map(x => {
    return result[x] > 0 ? (result[x] + " " + (result[x] == 1 ? x.slice(0, -1): x)): ""
  }).filter(x => x)
  var show = reverse ? `Expires in ${convert.join(" ")}`: `Expired ${convert.join(" ")} ago`
  return convert.length ? show: "Never had premium"
}

// Show background time
background.onclick = () => {
  if (!avatar.querySelector('input[name="user_id"]').value.length) { // If this value is not overwritten (i.e not logged in) then show login form
    trust.showModal()
    return
  }
  backgroundTime.showModal()
  var premium = document.querySelector(".background-time")
  var time = premium.previousElementSibling.value
  if (!premium.textContent.length && time.length) {
    premium.textContent = "Loading premium time..."
    setInterval(() => {
      var expired = time > (Date.now() / 1000)
      premium.textContent = displayEpoch(time, expired)
    }, 1000)
  }
}

// Toggle the sidebar view
document.querySelector(".sidebar-collapse").onclick = x => {
  if (x.currentTarget.style.transform) {
    x.currentTarget.removeAttribute("style")
    x.currentTarget.parentNode.style.transform = "translate(0)"
  } else {
    x.currentTarget.style.transform = "rotateY(180deg)"
    x.currentTarget.parentNode.removeAttribute("style")
  }
}

scroll(0, 0)

// View full profile
full.onclick = () => {
  if (!avatar.querySelector('input[name="user_id"]').value.length) { // If this value is not overwritten (i.e not logged in) then show login form
    trust.showModal()
    return
  }
  open(`https://${avatar.querySelector('input[name="user_id"]').value}.chatango.com/fpix`)
}

// Change theme
const toggleTheme = ["classic", "dark", "light"]

var setTheme = localStorage.getItem("theme")
if (setTheme) {
  document.body.setAttribute("data-theme", setTheme)
  var nextTheme = toggleTheme.indexOf(setTheme) + 1
  var selectTheme = toggleTheme[nextTheme] ? toggleTheme[nextTheme]: toggleTheme[0]
  theme.textContent = `${selectTheme[0].toUpperCase() + selectTheme.slice(1)} mode`
}

theme.onclick = () => {
  var currentTheme = document.body.getAttribute("data-theme")
  var nextTheme = toggleTheme.indexOf(currentTheme) + 1
  var selectTheme = toggleTheme[nextTheme] ? toggleTheme[nextTheme]: toggleTheme[0]
  var futureTheme = toggleTheme.indexOf(selectTheme) + 1
  var presentTheme = toggleTheme[futureTheme] ? toggleTheme[futureTheme]: toggleTheme[0]
  theme.textContent = `${presentTheme[0].toUpperCase() + presentTheme.slice(1)} mode`
  document.body.setAttribute("data-theme", selectTheme)
  localStorage.setItem("theme", selectTheme)
}

// Basically logout
logout.onclick = () => {
  location.reload()
}

// Load external dependencies, cropperjs for avatar cropping and underscore for Barry's tags parser
const plugins = {
  "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/2.0.0-alpha.2/cropper.min.js": {
    sha: "sha512-IlZV3863HqEgMeFLVllRjbNOoh8uVj0kgx0aYxgt4rdBABTZCl/h5MfshHD9BrnVs6Rs9yNN7kUQpzhcLkNmHw==",
    load: () => {
      console.log("Loaded plugin: cropperjs v2.0.0-alpha.2")
    },
    error: () => {
      console.log("Plugin cropperjs failed to load")
    }
  },
  "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.6/underscore-min.js": {
    sha: "sha512-2V49R8ndaagCOnwmj8QnbT1Gz/rie17UouD9Re5WxbzRVUGoftCu5IuqqtAM9+UC3fwfHCSJR1hkzNQh/2wdtg==",
    load: () => {
      console.log("Loaded plugin: underscore.js v1.13.6")
    },
    error: () => {
      console.log("Plugin underscore.js failed to load")
    }
  }
}

for (x in plugins) {
  var script = document.createElement("script")
  script.src = x
  script.integrity = plugins[x].sha
  script.crossOrigin = "anonymous"
  script.referrerPolicy = "no-referrer"
  script.onload = plugins[x].load
  script.onerror = plugins[x].error
  document.body.appendChild(script)
}

// The following is Barry's code for his tags parser, not modified at all

function parse(){
  var tags = document.getElementById('tags');
  var output = document.getElementById('output');
  output.value = filter(tags.value);
}

function filter(tags){
  var hidden = document.getElementById('hidden').checked;
  var sort = document.getElementById('sort').checked;
  var lowercase = document.getElementById('lowercase').checked;
  var splitter = document.getElementById('split').value;
  var join = document.getElementById('join').value;
  var infoField = document.getElementById('info');

  var len = tags.length;
  var tags = tags.split(splitter);
  var count = tags.length;

  tags = _.map(tags, function(x){
    if(lowercase) x = x.toLowerCase();
    return x.trim();
  });

  tags = _.compact(tags);

  tags = _.uniq(tags, false, function(x){
    return x.toLowerCase();
  });

  if(sort){
    tags = _.sortBy(tags, function(x){ return x.toLowerCase(); });
  }

  // Finished, display results
  var output = tags.join(join);

  infoField.innerHTML = 'Removed '+(count - tags.length)+' duplicate or empty tag(s), saved '+(len - output.length)+' characters';
  return hidden ? '<!-- '+output+' --\>' : output;
}
