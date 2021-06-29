import os, re, hashlib, requests, copy, html
import evernote.edam.type.ttypes as Types
import feedparser
from flask import Flask, request, jsonify, redirect, session
from flask_pymongo import PyMongo
from evernote.api.client import EvernoteClient
from evernote.edam.error.ttypes import EDAMUserException
from evernote.edam.error.ttypes import EDAMNotFoundException
from evernote.edam.error.ttypes import EDAMSystemException
from bs4 import BeautifulSoup, NavigableString
from urllib.parse import urlencode, quote_plus

application = Flask(__name__)
application.secret_key = os.environ['FLASK_SECRET_KEY']
application.config["MONGO_URI"] = 'mongodb://' + os.environ['MONGODB_USERNAME'] + ':' + os.environ['MONGODB_PASSWORD'] + '@' + os.environ['MONGODB_HOSTNAME'] + ':27017/' + os.environ['MONGODB_DATABASE']

CONSUMER_KEY = os.environ['EVERNOTE_CONSUMER_KEY']
CONSUMER_SECRET = os.environ['EVERNOTE_CONSUMER_SECRET']

mongo = PyMongo(application)
db = mongo.db

SANDBOX = os.environ['APP_DEBUG']
CHINA = os.environ['IS_CHINA']

REMOVE_ATTRIBUTES = [
    'lang','language','onmouseover','onmouseout','script','font',
    'dir','face','size','color','class','hspace',
    'border','valign','align','background','bgcolor','text','link','vlink',
    'alink','cellpadding','cellspacing', 'alt', 'src']

client = EvernoteClient(consumer_key= CONSUMER_KEY, consumer_secret= CONSUMER_SECRET, sandbox= SANDBOX, china= CHINA)
request_token = client.get_request_token('http://localhost/registerOauthUser')
session_token = request_token['oauth_token_secret']

@application.route('/')
def index():
    authorize_url = client.get_authorize_url(request_token)

    email = request.args.get('email')

    if not email:
        return '<h1>Debe incluir un correo en esta solicitud</h1>', 400, {'ContentType':'text/html'}

    session['email'] = email

    return redirect(authorize_url, code=302)

@application.route('/registerOauthUser')
def registerOauthUser():
    oauth_verifier= request.args.get('oauth_verifier')
    oauth_token= request.args.get('oauth_token')

    access_token = client.get_access_token( oauth_token, session_token, oauth_verifier, return_full_dict=True)    

    user = {
        'email': session['email'],
        'oauth_token': access_token["oauth_token"],
        'expires': access_token["edam_expires"],
    }

    print("*********** insertando usuario en BD **************", flush=True)
    db.users.insert_one(user)

    session.pop('email', None)

    return jsonify(
        status=True,
        message='User created!'
    )

@application.route('/addRSSFeed', methods=['POST'])
def addRSSFeed():
    user = db.users.find_one()

    # TODO: Identify user
    
    client = EvernoteClient(consumer_key= CONSUMER_KEY, consumer_secret= CONSUMER_SECRET, token=user["oauth_token"], sandbox= SANDBOX, china= CHINA)

    params = {
        'notebook': request.form.get('notebook'),
        'tags': request.form.getlist('tags[]'),
        'rssfeed': request.form.get('rssfeed')
    }

    if not params["rssfeed"]:
        return jsonify(
            status=False,
            message='Requires RSS Feed!'
        )

    noteStore = client.get_note_store()
    notebooks = noteStore.listNotebooks()
    notebook = None

    if params["notebook"]:
        for n in notebooks:
            if n.name == params["notebook"]:
                notebook = n
                break

    if notebook is None:
        notebook = noteStore.getDefaultNotebook()

    notebookTags = noteStore.listTags()

    tagObjects = []

    if len(notebookTags) > 0:
        for tag in notebookTags:
            if len(params['tags']) > 0:
                if tag.name in params['tags']:
                    tagObjects.append({ 'name': tag.name, 'guid': tag.guid})
                    indexToRemove = params['tags'].index(tag.name)
                    del params['tags'][indexToRemove]
            else: 
                break

    if len(params['tags']) > 0:
        for tag in params['tags']:
            newTag = Types.Tag()
            newTag.name = tag
            newTag = noteStore.createTag(newTag)
            tagObjects.append({ 'name': newTag.name, 'guid': newTag.guid})

    rssfeed = {
        'url': params['rssfeed'],
        'notebook': {
            'name': notebook.name,
            'guid': notebook.guid
        },
        'tags': tagObjects,
        'active': True,
        'user': {
            '_id': user["_id"],
            'oauth_token': user["oauth_token"]
        }
    }

    db.rssfeeds.insert_one(rssfeed)

    return jsonify(
        status=True,
        message='RSSFedd created!',
        rssfeed= str(rssfeed)
    )

@application.route('/insertEntriesFromFeed')
def insertEntriesFromFeed():
    _feeds = db.rssfeeds.find({ 'active': True }) 

    result = []   

    for feed in _feeds:
        try:
            newsFeed = feedparser.parse(feed["url"])
            feedEntries = []
            for entry in newsFeed.entries:
                feedEntries.append({
                    "entry_id": entry["id"],
                    "title": entry["title"],
                    "author": ", ".join([author["name"] for author in entry["authors"]]),
                    "content": entry["content"][0].value,
                    "link": entry["link"],
                    "created": False,
                    "errors": [],
                    "feed_id": feed["_id"]
                })

            transaction = db.entries.insert_many(feedEntries)

            result.append({ "feed": feed["url"], "inserted": len(transaction.inserted_ids)})
        except Exception as e:
            return jsonify(
                status=False,
                result=str(result),
                error= str(e)
            )
        
    return jsonify(
        status=True,
        result=str(result)
    )

@application.route('/createNotesFromEntries')
def createNotesFromEntries():
    _feeds = db.rssfeeds.find({ "active": True })
    created = 0
    errors = []

    feeds_ids = [feed["_id"] for feed in _feeds]

    _feeds.rewind()

    try:
        currentFeed = _feeds.next()
    except StopIteration as e:
        errors.append(e)
        return jsonify(
            status=True,
            created= created,
            errors= str(errors)
        )

    entries = db.entries.find({ "feed_id": { "$in": feeds_ids }, "created": False})

    for entry in entries:
        if entry["feed_id"] != currentFeed["_id"]:
            currentFeed = filter(lambda feed: feed['user']["_id"] == entry["feed_id"], _feeds)

        client = EvernoteClient(consumer_key= CONSUMER_KEY, consumer_secret= CONSUMER_SECRET, token=currentFeed["user"]["oauth_token"], sandbox= SANDBOX, china= CHINA)
        noteStore = client.get_note_store()
        notebook = None
        tags=None

        if currentFeed["notebook"]["guid"]:
            notebook = noteStore.getNotebook(currentFeed["notebook"]["guid"])

        if currentFeed["tags"]:
            tags = [tag["guid"] for tag in currentFeed["tags"]]

        note, error = makeNote(noteStore, entry, tags=tags, parentNotebook=notebook)

        query = { "_id": entry["_id"] }

        if error:
            errors.append(error)
            setValues = { "$push": { "errors": error } }
        else :
            setValues = { "$set": { "created": True } }
            created += 1

        db.entries.update_one(query, setValues)

    return jsonify(
        status=True,
        created= created,
        errors= str(errors)
    )

def getMD5src(url): 
    response = requests.get(url, stream = True)

    # Check if the image was retrieved successfully
    try:
        if response.status_code == 200:
            # Set decode_content value to True, otherwise the downloaded image file's size will be zero.
            response.raw.decode_content = True
            
            fileHash = hashlib.md5()
            fileHash.update(response.content)

            fileBody = response.content
                
            return fileHash.hexdigest(), response.headers["Content-type"], fileBody        
    except Exception as e:
        print(e, flush=True)
        return None, None, None

def makeNote(noteStore, entry, tags=None, parentNotebook=None):
    """
    Create a Note instance with title and body 
    Send Note object to user's account
    """

    resources = []

    parsedContent = BeautifulSoup(entry["content"], 'html.parser')

    soup = BeautifulSoup()
    noteContent = soup.new_tag('div')

    for tag in parsedContent.contents:
        newContent = None        
        if isinstance(tag, NavigableString):
            newContent = soup.new_tag('div')
            newContent.string = html.escape(tag)
        if tag.name == 'img' and 'src' in tag:
            tag.name = 'en-media'
            md5, mime, body = getMD5src(tag['src'])
            if md5 is not None and mime is not None and body is not None:
                data = Types.Data()
                data.body = body
                data.bodyHash = md5
                data.size = len(body)
                resource = Types.Resource()
                resource.data = data
                resource.mime = mime
                resources.append(resource)
                tag["hash"] = md5
                tag["type"] = mime
                tag.attrs = [(key,value) for key,value in tag.attrs.items()
                            if key not in REMOVE_ATTRIBUTES]
                newContent = copy.copy(tag)                

        if newContent is not None:
            noteContent.append(newContent)

    note = Types.Note()
    note.title = entry["title"]

    ## Build body of note

    note.content = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">'
    note.content += '<en-note>'
    note.content += html.escape(entry["title"]) 
    note.content += "<br />" * 2
    note.content += html.escape(entry["author"]) 
    note.content += "<br />" * 2
    note.content += entry["entry_id"]
    note.content += "<br />" * 2    
    note.content += str(noteContent)
    note.content += '</en-note>'

    if resources:
        note.resources = resources

    if tags is not None:
        note.tagGuids = tags

    ## parentNotebook is optional; if omitted, default notebook is used
    if parentNotebook and hasattr(parentNotebook, 'guid'):
        note.notebookGuid = parentNotebook.guid

    ## Attempt to create note in Evernote account
    try:
        newNote = noteStore.createNote(note)
    except EDAMUserException as e:
        ## Something was wrong with the note data
        ## See EDAMErrorCode enumeration for error code explanation
        ## http://dev.evernote.com/documentation/reference/Errors.html#Enum_EDAMErrorCode
        print("EDAMUserException:" + e.parameter, flush=True)
        return None, e.parameter
    except EDAMNotFoundException as e:
        ## Parent Notebook GUID doesn't correspond to an actual notebook
        print("EDAMNotFoundException: " + e.parameter, flush=True)
        return None, e.parameter
    except EDAMSystemException as e:
        ## Parent Notebook GUID doesn't correspond to an actual notebook
        print("EDAMSystemException: " + e.parameter, flush=True)
        return None, e.parameter
    ## Return created note object
    return newNote, None

if __name__ == "__main__":
    ENVIRONMENT_DEBUG = os.environ.get("APP_DEBUG", True)
    ENVIRONMENT_PORT = os.environ.get("APP_PORT", 5000)
    application.run(host='0.0.0.0', port=ENVIRONMENT_PORT, debug=ENVIRONMENT_DEBUG)