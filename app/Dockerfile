FROM python:3.8.6-alpine3.12

LABEL MAINTAINER="Rigoberto Quezada isvaku@hotmail.com"

ENV GROUP_ID=1000 \
    USER_ID=1000

WORKDIR /var/www/

ADD ./requirements.txt /var/www/requirements.txt
RUN pip install -r requirements.txt
ADD . /var/www/
RUN pip install gunicorn

RUN addgroup -g $GROUP_ID www
RUN adduser -D -u $USER_ID -G www www -s /bin/sh

USER www

EXPOSE 5000

CMD [ "gunicorn", "-w", "4", "--preload", "--log-level", "debug", "-t", "9999", "--keep-alive", "3", "--bind", "0.0.0.0:5000", "wsgi"]