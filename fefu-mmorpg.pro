CONFIG += ordered

TEMPLATE = subdirs

SUBDIRS += 3rd/qhttpserver \
           server \
#           3rd/QtWebsocket \
           angband-parser

server.depends += qhttpserver \
#                  QtWebsocket
