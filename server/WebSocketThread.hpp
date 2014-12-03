#pragma once

#include <QtNetwork>
#include <QThread>

//#include "QWsSocket.h"
#include <QtWebSockets/QtWebSockets>

class SocketThread : public QThread
{
  Q_OBJECT

signals:
  void newFEMPRequest(const QVariantMap& request, QVariantMap& response);

public:
  SocketThread(QWebSocket* wsSocket);
  ~SocketThread();

  QWebSocket* socket;
  void run();

private slots:
  void processMessage(QString message);
  void sendMessage(QString message);
  void processPong(quint64 elapsedTime, const QByteArray& payload);
  void socketDisconnected();
  void onError(QAbstractSocket::SocketError error);

signals:
  void messageReceived(QString frame);

private:

};
