import re
import html
import json
import time
import flask
import requests
import lxml.etree

"""
A web application that recreates the Flash Chatango profile editor in HTML5, intended to be ran locally.
Allowing you to remotely update your full Chatango profile with a familiar interface.

Version: 1.0.1
Author: @Cheese [https://github.com/Vissle-Drissle]
Requirements:
  - Python ^3.10.x
  - lxml ^4.9.2
  - flask ^2.3.3
  - requests ^2.29.0
"""

root = "https://chatango.com"
token = False
user_id = False
headers = {
  "User-Agent": "Mozilla/5.0"
  }

app = flask.Flask(__name__)

@app.route("/", methods=["GET"])
def index(): return flask.redirect("/updateprofile")

# Log in to Chatango and get the authorization token for the account to then retrieve its profile information
@app.route("/login", methods=["POST"])
def login():
    global token
    global headers
    global user_id
    try:
      form = json.loads(flask.request.data)
      username = form.get("user_id").lower()
      user_id = username
      header = form.pop("ua")
      with requests.Session() as fetch:
        headers["User-Agent"] = header
        token = fetch.post(f"{root}/login",
                           data=form,
                           timeout=5,
                           headers=headers
                           ).cookies.get("auth.chatango.com", False, domain=".chatango.com")
        if token:
          profile = fetch.post(f"{root}/updateprofile",
                               data={
                                 "s": token,
                                 "auth": "token",
                                 "arch": "h5",
                                 "src": "group"
                                 },
                               timeout=5,
                               headers=headers
                               ).text
          with open(f"static/avatars/{username}.jpg", "wb") as file:
            short = f"{username[0]}/{username[1] if len(username) > 1 else username[0]}/{username}".lower()
            avatar = fetch.get(f"https://ust.chatango.com/profileimg/{short}/full.jpg",
                               headers=headers
                               ).content
            file.write(avatar)
          return profile
        else: return "error=Username or password is incorrect."
    except Exception as error:
      print(error)
      return "error=" + str(error).replace("=", "-")

# Get the full profile information of account
@app.route("/getprofile/<username>", methods=["GET"])
def getprofile(username):
    short = f"{username[0]}/{username[1] if len(username) > 1 else username[0]}/{username}".lower()
    profile = {}
    full = requests.get(f"https://ust.chatango.com/profileimg/{short}/mod2.xml",
                        headers=headers
                        ).text
    if "Adobe" not in full:
      content = lxml.etree.fromstring(full).find("body")
      profile["profile"] = requests.utils.unquote(content.text)
    custom = requests.get(f"https://ust.chatango.com/profileimg/{short}/custom_profile.css",
                          headers=headers
                          ).text
    if "Adobe" not in custom:
      background = re.search("background-image: url\((.*?)\)", custom)
      profile["body_bg_img"] = background[1] if background else False
      profile["body_bg_col"] = re.search("background-color: (.*?);", custom)[1]
      profile["body_col"] = re.search("profile_text (.*?);", custom, re.DOTALL)[1].split("color: ")[1]
      profile["body_a_col"] = re.search("a:hover (.*?);", custom, re.DOTALL)[1].split("color: ")[1]
      profile["tile"] = re.search("background-repeat: (.*?);", custom)[1]
    return profile

# Profile endpoint to view and update the profile, should be available at http://localhost:8080/updateprofile
@app.route("/updateprofile", methods=["GET", "POST"])
def updateprofile():
    if flask.request.method == "GET": return flask.render_template("updateprofile.htm")
    else:
      link = root + "/updateprofile"
      data = {
        "s": token,
        "auth": "token",
        "arch": "h5",
        "src": "group",
        "action": "update"
        }
      if flask.request.form and flask.request.files:
        data["action"] = "fullpic"
        file = flask.request.files.get("image")
        byte = file.read()
        update = requests.post(link,
                              data=data,
                              files={
                                "Filedata": (file.filename, byte)
                                },
                              timeout=5,
                              headers=headers
                              )
        with open(f"static/avatars/{user_id}.jpg", "wb") as file:
          short = f"{user_id[0]}/{user_id[1] if len(user_id) > 1 else user_id[0]}/{user_id}".lower()
          avatar = requests.get(f"https://ust.chatango.com/profileimg/{short}/full.jpg",
                                headers=headers
                                ).content
          file.write(avatar)
        errors = {
          403: "Unauthorized, relogin is required",
          404: "Missing parameters",
          406: "Please submit JPEG or GIF images only",
          415: "Picture editing not available due to server maintainence - please try again in 1-2 hours"
        }
        return ("error=" + errors[update.status_code]) if update.status_code in errors else update.text
      elif flask.request.data:
        form = json.loads(flask.request.data)
        if "body_bg_col" in form:
          form["body_bg_col"] = form["body_bg_col"].strip("#")
          form["body_col"] = form["body_col"].strip("#")
          form["body_a_col"] = form["body_a_col"].strip("#")
          form["body_tile_a"] = int(bool(form.get("body_tile_a", 0)))
          form["body_tile_d"] = int(bool(form.get("body_tile_d", 0)))
          link += "?css"
        payload = data | form
        update = requests.post(link,
                               data=payload,
                               timeout=5,
                               headers=headers
                               )
        return update.text

app.run(host="0.0.0.0", port=8080)
