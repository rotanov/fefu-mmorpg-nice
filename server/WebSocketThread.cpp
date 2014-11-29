#include "WebSocketThread.hpp"

#include <windows.h>


#include <iostream>

SocketThread::SocketThread(QWebSocket *wsSocket)
  : socket(wsSocket)
{
  // Set this thread as parent of the socket
  // This will push the socket in the good thread when using moveToThread on the parent
  //    if (socket)
  //    {
  //        socket->setParent(this);
  //    }

  // Move this thread object in the thread himsleft
  // Thats necessary to exec the event loop in this thread
  //    moveToThread(this);
}

SocketThread::~SocketThread()
{
}

void SocketThread::run()
{
  std::cout << tr("connect done in thread : 0x%1")
               .arg(QString::number((unsigned int)QThread::currentThreadId(), 16))
               .toStdString() << std::endl;

  // Connecting the socket signals here to exec the slots in the new thread
  QObject::connect(socket, SIGNAL(textFrameReceived(QString, bool)), this, SLOT(processMessage(QString, bool)));
  QObject::connect(socket, SIGNAL(disconnected()), this, SLOT(socketDisconnected()));
  //    QObject::connect(socket, SIGNAL(pong(quint64)), this, SLOT(processPong(quint64)));
  QObject::connect(this, SIGNAL(finished()), this, SLOT(finished()), Qt::DirectConnection);

  // Launch the event loop to exec the slots
  exec();
}

void SocketThread::finished()
{
  this->moveToThread(QCoreApplication::instance()->thread());
  this->deleteLater();
}

void SocketThread::processMessage(QString message, bool lastFrame)
{
  if (!lastFrame)
  {
    qDebug() << "ws: non last frame";
  }
  // ANY PROCESS HERE IS DONE IN THE SOCKET THREAD !
  //    std::cout << tr("thread 0x%1 | %2")
  //        .arg(QString::number((unsigned int)QThread::currentThreadId(), 16))
  //        .arg(QString(message)).toStdString() << std::endl;

  auto request = QJsonDocument::fromJson(message.toLatin1()).toVariant().toMap();
  QVariantMap response;
  emit newFEMPRequest(request, response);
  auto responseJSON = QJsonDocument::fromVariant(response).toJson();
  //   qDebug() << "response JSON: " << responseJSON;

  //    static int pes = 1;
  //    pes++;
  //    while (true)
  //    {
  //        std::cerr << pes << std::endl;
  //        Sleep(1000);
  //        WaitForSingleObject(nullptr, 0);
  //    }
  //    pes++;
  //    std::cerr << "pes interruprt" << pes << std::endl;
  //   socket->write(QString::fromLatin1(responseJSON));
  QString textMessage = QString::fromLatin1(responseJSON);
  qint64 bytesSent = socket->sendTextMessage(textMessage);
  // TODO: there are cases when it's != but sent is more than we had
  if (bytesSent < textMessage.size())
  {
    qDebug() << "Data was not sent. Data size: "
             << textMessage.size()
             << " Sent size: "
             << bytesSent
             << textMessage;
  }
  else
  {
//    qDebug() << textMessage;
  }
  //   socket->sendBinaryMessage(responseJSON);
}

void SocketThread::sendMessage(QString message)
{
  //    socket->write(message);
  socket->sendTextMessage(message);
}

void SocketThread::processPong(quint64 elapsedTime)
{
  std::cout << tr("ping: %1 ms").arg(elapsedTime).toStdString() << std::endl;
}

void SocketThread::socketDisconnected()
{
  std::cout << tr("Client disconnected, thread finished").toStdString() << std::endl;

  // Prepare the socket to be deleted after last events processed
  socket->deleteLater();

  // finish the thread execution (that quit the event loop launched by exec)
  quit();
}
