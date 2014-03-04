#include "Server.hpp"

#include <cstdio>
#include <cstdlib>
#include <iostream>

#include <QFile>
#include <QRegExp>
#include <QJsonDocument>
#include <QCryptographicHash>
#include <QTime>

#include "qhttpserver.h"
#include "qhttprequest.h"
#include "qhttpresponse.h"


QMap<QString, QString> db;
QMap<QByteArray,QString> sids;
size_t minPrasswordLength = 6;
size_t maxPrasswordLength = 36;
void Authentication(QByteArray data_, QHttpResponse* resp);
QVariantMap Registration(QString userLogin, QString userPassword);
QVariantMap Login(QString userLogin, QString userPassword);
QVariantMap Logout(QByteArray sid);


Server::Server()
{
    httpServer_ = new QHttpServer(this);
    connect(httpServer_
            , SIGNAL(newRequest(QHttpRequest*, QHttpResponse*))
            , this
            , SLOT(handleRequest(QHttpRequest*, QHttpResponse*)));
}

Server::~Server()
{
    delete httpServer_;
}

void Server::handleRequest(QHttpRequest *req, QHttpResponse *resp)
{
//    Q_UNUSED(req);

    connect(req, SIGNAL(end()), this, SLOT(dataEnd()));
    connect(req, SIGNAL(data(QByteArray)), this, SLOT(data(QByteArray)));

    response_ = resp;

    auto uri = req->url();
    auto& headers = req->headers();
    auto path = req->path();
    auto method = req->method();
    auto data = req->body();

    resp->setHeader("Cache-control", "no-cache, no-store");

    std::cerr << path.toStdString() << std::endl;
    QFile index("../client" + path);

//    resp->setHeader("Content-Type", "text/html; charset=utf-8");

    QByteArray body;

    if (!index.open(QIODevice::ReadOnly))
    {
        body = "404 not found";
        resp->setHeader("Content-Length", QString::number(body.size()));
        resp->setHeader("Content-Type", "text/plain; charset=utf-8");
        resp->writeHead(404);
        resp->end(body);
        return;
    }

    if (method != 3)
    {
        body = index.readAll();
        resp->setHeader("Content-Length", QString::number(body.size()));
        resp->writeHead(200);
        resp->end(body);
    }
}

void Server::dataEnd()
{
    response_;
}

void Server::data(const QByteArray& data)
{
    data_ = data;
    Authentication(data_, response_);
}

void Authentication(QByteArray data_, QHttpResponse* resp)
{
    QVariant qVariant = QJsonDocument::fromJson(data_).toVariant();
    QVariantMap jsonData = qVariant.toMap();

    QMap<QString, QVariant>::iterator iter = jsonData.find("action");
    if (!QString::compare(iter.value().toString(), QString("clear")))
    {
        db.clear();
        return;
    }
    if (!QString::compare(iter.value().toString(), QString("logout")))
    {
         QJsonDocument json;
         QByteArray sid = jsonData.find("sid").value().toByteArray();
         json = QJsonDocument::fromVariant(Logout(sid));
         resp->writeHead(200);
         resp->end(json.toJson());
         return;
    }
    QString userLogin = jsonData.find("login").value().toString();
    QString userPassword = jsonData.find("password").value().toString();

    QVariantMap answer;
    if (!QString::compare(iter.value().toString(), QString("register")))
    {
        answer = Registration(userLogin, userPassword);
        if (answer["result"] == "ok")
        {
            /*start session*/
            answer = Login(userLogin, userPassword);
        }
    }
    else if (!QString::compare(iter.value().toString(), QString("login")))
    {
        answer = Login(userLogin, userPassword);
    }
    QJsonDocument json;
    json = QJsonDocument::fromVariant(answer);
    resp->writeHead(200);
    resp->end(json.toJson());
    return;
}

QVariantMap Registration(QString userLogin, QString userPassword)
{
    QVariantMap answer;
    QRegExp rx("[A-Za-z0-9]+");
    if (db.find(userLogin) != db.end())
    {
        answer.insert("result", "loginExists");
    }
    else if (!rx.exactMatch(userLogin))
    {
        answer.insert("result", "badLogin");
    }
    else if (userPassword.length() < minPrasswordLength
            || userPassword.length() > maxPrasswordLength)
    {
        answer.insert("result", "badPassword");
    }
    else
    {
        answer.insert("result", "ok");
        db.insert(userLogin, userPassword);
    }
    QMap<QString, QString>::const_iterator i;
    for (i = db.constBegin(); i != db.constEnd(); ++i)
        qDebug() << i.key() << ":" << i.value();
    return answer;
}

QVariantMap Login(QString userLogin, QString userPassword)
{
    QVariantMap answer;
    if (db.find(userLogin) == db.end() ||
        QString::compare(db[userLogin], userPassword))
    {
        answer.insert("result", "invalidCredentials");
    }
    else
    {
        answer.insert("result", "ok");
        QTime midnight(0,0,0);
        qsrand(midnight.secsTo(QTime::currentTime()));
        QByteArray id ;
        id.append(QString(qrand()));
        QByteArray sid = QCryptographicHash::hash(id, QCryptographicHash::Md5);
        sids.insert(sid.toHex(), userLogin);
        answer.insert("sid", sid.toHex());
    }
    return answer;
}

QVariantMap Logout (QByteArray sid)
{
    QVariantMap answer;
    if (sids.find(sid) == sids.end())
    {
        answer.insert("result", "badSid");
    }
    else
    {
        answer.insert("result", "ok");
        QMap<QByteArray,QString>::iterator iter = sids.find(sid);
        sids.erase(iter);
    }
    return answer;
}


void Server::Start()
{
    if (!running_)
    {
        running_ = httpServer_->listen(port_);

        if (!running_)
        {
            qDebug() << "Unable to start http server.";
        }
        else
        {
            qDebug() << "Server started.";
        }
    }
    else
    {
        qDebug() << "Server already running.";
    }
}


void Server::Stop()
{
    if (running_)
    {
        httpServer_->close();
        running_ = false;
        qDebug() << "Server stopped.";
    }
    else
    {
        qDebug() << "Attempt to stop server while it's not running.";
    }
}
