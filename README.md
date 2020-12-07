# Flask-Evernote-RSS
---------------

Flask-Evernote-RSS is an integration that allows Evernote's users to create notes given any RSS feed.

## Getting started
---------------

Download [Docker Desktop](https://www.docker.com/products/docker-desktop) for Mac or Windows. [Docker Compose](https://docs.docker.com/compose) will be automatically installed. On Linux, make sure you have the latest version of [Compose](https://docs.docker.com/compose/install/). 

## Containers
---------------

The app stack uses Python, Nginx, Cron (using shell scripts) and MongoDB for storage.

Run in this directory:
```
docker-compose up
```
The app will be running at either [http://localhost:80](http://localhost:80) or [http://localhost:443](http://localhost:443).


## Contributing
---------------
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)