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

void HandleQDebugMessageOutput(QtMsgType type
                             , const QMessageLogContext& context
                             , const QString &msg);

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
#if (_DEBUG)
  qInstallMessageHandler(HandleQDebugMessageOutput);
#endif

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

void HandleQDebugMessageOutput(QtMsgType type
                             , const QMessageLogContext& context
                             , const QString &msg)
{
  Q_UNUSED(context);

  QByteArray localMsg = msg.toLocal8Bit();
  //    FILE* logfile = fopen("logFilename.log", "a");
  //    fprintf(logfile, "%s (%s:%u, %s)\n", localMsg.constData(), context.file, context.line, context.function);
  //    fclose(logfile);

  static std::string messageDescriptions [] =
  {
    "Debug",
    "Warning",
    "Critical",
    "Fatal",
  };

  QString completeMessage = QString().fromStdString(messageDescriptions[type])
      + QString(": %1\n");// (%2:%3, %4)\n");

  completeMessage = completeMessage
      .arg(localMsg.constData());
  //  uncomment for additional info
  //                      .arg(context.file)
  //                      .arg(context.line)
  //                      .arg(context.function);

  std::cerr << completeMessage.toStdString();
  //    std::cout << completeMessage.toStdString();

  //    std::cerr.flush();
  std::cout.flush();

  fprintf(stderr, "%s", completeMessage.toStdString().c_str());

  fflush(stderr);
  fflush(stdout);
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
