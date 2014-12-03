#include "WebSocketThread.hpp"

#include <windows.h>


#include <iostream>

SocketThread::SocketThread(QWebSocket *wsSocket)
  : socket(wsSocket)
{
  std::cout << tr("connect done in thread : 0x%1")
               .arg(QString::number((unsigned int)QThread::currentThreadId(), 16))
               .toStdString() << std::endl;

  connect(socket, &QWebSocket::textMessageReceived
        , this, &SocketThread::processMessage);

  connect(socket, &QWebSocket::disconnected
        , this, &SocketThread::socketDisconnected);

  connect(socket, &QWebSocket::pong
        , this, &SocketThread::processPong);

  connect(socket, SIGNAL(error(QAbstractSocket::SocketError))
        , this, SLOT(onError(QAbstractSocket::SocketError)));
}

SocketThread::~SocketThread()
{
  delete socket;
}

void SocketThread::run()
{

}

void SocketThread::onError(QAbstractSocket::SocketError error)
{
  Q_UNUSED(error);
  qDebug() << "socket error: " << socket->errorString();
}

void SocketThread::processMessage(QString message)
{
//  std::cout << tr("thread 0x%1 | %2")
//      .arg(QString::number((unsigned int)QThread::currentThreadId(), 16))
//      .arg(QString(message)).toStdString() << std::endl;

//  qDebug() << message;
  auto request = QJsonDocument::fromJson(message.toLatin1()).toVariant().toMap();
  QVariantMap response;
  emit newFEMPRequest(request, response);
  auto responseJSON = QJsonDocument::fromVariant(response).toJson();
//  qDebug() << "response JSON: " << responseJSON;
  QString textMessage = QString::fromLatin1(responseJSON);
  qint64 bytesSent = socket->sendTextMessage(textMessage);
//  TODO: there are cases when it's != but sent is more than we had
  if (bytesSent < textMessage.size())
  {
    qDebug() << "Data was not sent. Data size: "
             << textMessage.size()
             << " Sent size: "
             << bytesSent
             << textMessage;
    qDebug() << socket->errorString();
  }
  else if (bytesSent > textMessage.size())
  {
    qDebug() << socket->errorString();
    qDebug() << textMessage;
  }
}

void SocketThread::sendMessage(QString message)
{
  socket->sendTextMessage(message);
}

void SocketThread::processPong(quint64 elapsedTime, const QByteArray& payload)
{
  qDebug() << tr("ping: %1 ms").arg(elapsedTime);
  qDebug() << payload;
}

void SocketThread::socketDisconnected()
{
  std::cout << tr("Client disconnected, thread finished").toStdString() << std::endl;
  this->deleteLater();
}
