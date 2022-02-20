FROM alpine:3.14.1

RUN apk add --update apk-cron tzdata && \
	rm -rf /var/cache/apk/* && \
	apk add --no-cache curl

ADD crontab.txt /crontab.txt
ADD createEntriesScript.sh /createEntriesScript.sh
ADD createNotesScript.sh /createNotesScript.sh
COPY entry.sh /entry.sh
RUN chmod 755 /createEntriesScript.sh /createNotesScript.sh /entry.sh
RUN /usr/bin/crontab /crontab.txt

CMD ["/entry.sh"]