#include <iostream>

#include <QtCore>
#include <QTimer>
#include <QtMessageHandler>
#include <QLocalSocket>
#include <QLocalServer>

#include "Server.hpp"
#include "GameServer.hpp"

QLocalServer* localServer = nullptr;
Server* server_ = nullptr;
GameServer* gameServer_ = nullptr;

class InitTask : public QObject
{
  Q_OBJECT

public:
  InitTask(QObject* parent = nullptr);

public slots:
  void run();
  void newLocalSocketConnection();

private:
  void Init();
};

#include "main.moc"
int main(int argc, char **argv)
{
  const QString SERVER_NAME = "fefu-mmorpg-nice-server";

  QLocalSocket socket;
  socket.connectToServer(SERVER_NAME);
  if (socket.waitForConnected(500))
  {
    if (argc > 1)
    {
      socket.write(argv[1]);
      socket.waitForBytesWritten(500);
    }
    socket.close();
    return EXIT_SUCCESS;
  }

  QCoreApplication a(argc, argv);

  InitTask* task = new InitTask(&a);

  localServer = new QLocalServer(&a);
  QObject::connect(localServer, SIGNAL(newConnection())
                 , task, SLOT(newLocalSocketConnection()));
  localServer->listen(SERVER_NAME);

  QTimer::singleShot(0, task, SLOT(run()));

  return a.exec();
}

InitTask::InitTask(QObject* parent)
  : QObject(parent)
{

}

void InitTask::run()
{
  Init();
}

void InitTask::newLocalSocketConnection()
{
  auto incoming = localServer->nextPendingConnection();
  incoming->waitForReadyRead(500);
  auto data = incoming->readAll();
  incoming->close();

  auto stopServer = [=]()
  {
    gameServer_->Stop();
    server_->Stop();
  };

  if (data == "--stop")
  {
    stopServer();
  }
  else if (data == "--start")
  {
    server_->Start();
    gameServer_->Start();
  }
  else if (data == "--quit")
  {
    stopServer();
    QCoreApplication::quit();
  }
}

void InitTask::Init()
{
  server_ = new Server;
  gameServer_ = new GameServer;

  connect(server_,
          &Server::newFEMPRequest,
          gameServer_,
          &GameServer::handleFEMPRequest,
          Qt::DirectConnection);

  connect(server_,
          &Server::wsAddressChanged,
          gameServer_,
          &GameServer::setWSAddress,
          Qt::DirectConnection);

  connect(gameServer_,
          &GameServer::broadcastMessage,
          server_,
          &Server::broadcastMessage);

  std::cout << QObject::tr("main thread : 0x%1")
               .arg(QString::number((unsigned int)QThread::currentThreadId(), 16))
               .toStdString() << std::endl;

  server_->Start();
  gameServer_->Start();
}
