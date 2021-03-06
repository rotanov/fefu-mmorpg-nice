#include "GameServer.hpp"

#include <QRegExp>
#include <QJsonDocument>
#include <QCryptographicHash>
#include <QTime>
#include <QVariant>
#include <QDebug>
#include <QtGui/QImage>
#include <QtGui/QPixmap>
#include <QFile>

#include "PermaStorage.hpp"
#include "utils.hpp"

GameServer::GameServer()
  : levelMap_(16, 16)
{
  QTime midnight(0, 0, 0);
  qsrand(midnight.secsTo(QTime::currentTime()));
  srand(3);

  // TODO: move tick somewhere, don't use QTimer it's totally useless for stable
  // 60FPS game loop
  timer_ = new QTimer(this);
  timer_->setTimerType(Qt::PreciseTimer);
  connect(timer_
        , &QTimer::timeout
        , this
        , &GameServer::tick);
  timer_->setInterval(1000.0f / static_cast<float>(ticksPerSecond_));

//  GenRandSmoothMap(levelMap_);
//  levelMap_.ExportToImage("generated-level-map.png");
  LoadLevelFromImage_("level-1.png");
}

GameServer::~GameServer()
{
  for (auto actor : actors_)
  {
    delete actor;
  }
}

bool GameServer::Start()
{
  if (storage_.Connect())
  {
    storage_.InitSchema();
    timer_->start();
    time_.start();
    lastTime_ = time_.elapsed();
    GenMonsters_();
    return true;
  }
  return false;
}

void GameServer::Stop()
{
  storage_.Reset();
  storage_.Disconnect();
  timer_->stop();
}

void GameServer::handleFEMPRequest(const QVariantMap& request, QVariantMap& response)
{
  response["action"] = request["action"];

  auto actionIt = request.find("action");
  if (actionIt == request.end())
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  QString action = actionIt.value().toString();

  auto handlerIt = requestHandlers_.find(action);
  if (handlerIt == requestHandlers_.end())
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  if (sidCheckExceptions_.count(action.toStdString()) == 0)
  {
    if (request.find("sid") == request.end()
        || sidToPlayer_.find(request["sid"].toByteArray()) == sidToPlayer_.end())
    {
      WriteResult_(response, EFEMPResult::BAD_SID);
      return;
    }
  }

  auto handler = handlerIt.value();
  (this->*handler)(request, response);

  if (response.find("result") == response.end())
  {
    WriteResult_(response, EFEMPResult::OK);
  }
}

void GameServer::HandleRegister_(const QVariantMap& request, QVariantMap& response)
{
  QString login = request["login"].toString();
  QString password = request["password"].toString();
  QString heroClass = request["class"].toString();

  bool passHasInvalidChars = false;

  for (int i = 0; i < password.size(); i++)
  {
    if (!password[i].isPrint())
    {
      passHasInvalidChars = true;
      break;
    }
  }

  UserData userData;
  if (storage_.GetUser(login, userData))
  {
    WriteResult_(response, EFEMPResult::LOGIN_EXISTS);
  }
  else if (!QRegExp("[0-9a-zA-Z]{2,36}").exactMatch(login))
  {
    WriteResult_(response, EFEMPResult::BAD_LOGIN);
  }
  else if (!QRegExp(".{6,36}").exactMatch(password)
           || passHasInvalidChars)
  {
    WriteResult_(response, EFEMPResult::BAD_PASS);
  }
  else if (heroClass != "warrior"
           && heroClass != "rogue"
           && heroClass != "mage")
  {
    WriteResult_(response, EFEMPResult::BAD_CLASS);
  }
  else
  {
    QByteArray salt = QString::number(qrand()).toLatin1();
    QByteArray passwordWithSalt = password.toUtf8();
    passwordWithSalt.append(salt);
    QByteArray hash = QCryptographicHash::hash(passwordWithSalt, QCryptographicHash::Sha3_256);
    storage_.AddUser(login, QString(hash.toBase64()), QString(salt.toBase64()), heroClass);
  }
}

void GameServer::HandleDestroyItem_(const QVariantMap& request, QVariantMap& response)
{
#define BAD_ID(COND)\
  if (COND)\
  {\
    WriteResult_(response, EFEMPResult::BAD_ID);\
    return;\
  }\

  BAD_ID(request.find("id") == request.end());
  int id = request["id"].toInt();
  BAD_ID(!id);
  Player* p = sidToPlayer_[request["sid"].toByteArray()];

  if (p->DropItemFromSlot(id))
  {
    //destroy item from slot
    WriteResult_(response, EFEMPResult::OK);
    return;
  }

  if (p->GetItemId(id))
  {
    //destroy item from inventory
    for (auto& item : p->items)
    {
      if (item->GetId() == id)
      {
        p->items.erase(std::remove(p->items.begin(), p->items.end(), item), p->items.end());
        idToActor_.erase(id);
        break;
      }
    }
  }
  else
  {
    //item is on the ground
    Item* item = dynamic_cast<Item*>(idToActor_[id]);
    BAD_ID(!item || !item->GetOnTheGround());

    Vector2 player_pos = p->GetPosition();
    Vector2 item_pos = item->GetPosition();
    float distance2 = Sqr(player_pos.x - item_pos.x)
                      + Sqr(player_pos.y - item_pos.y);
    BAD_ID(distance2 > Sqr(pickUpRadius_))
    KillActor_(item);
  }

  // TODO: implement
#undef BAD_ID
}

void GameServer::setWSAddress(QString address)
{
  wsAddress_ = address;
}

void GameServer::tick()
{
  float dt = (time_.elapsed() - lastTime_) * 0.001f;
  lastTime_ = time_.elapsed();

  if (dt > 0.02f)
  {
    qDebug() << "Warning: dt is too big: " << dt;
  }

  collisionPairUniqueness_.clear();
  collisions_.clear();
  deadActors_.clear();
  unsigned monsterCount = 0;

  for (auto actor : actors_)
  {
    levelMap_.RemoveActor(actor);
    actor->Update(dt);
    FindCollisions_(actor, dt);

    Creature* creature = static_cast<Creature*>(actor);
    switch (actor->GetType())
    {
      case EActorType::MONSTER:
        if (creature->GetHealth() <= 0)
        {
          deadActors_.insert(actor);
        }
        else
        {
          monsterCount++;
        }
        break;

      case EActorType::PLAYER:
      {
        Player* p = static_cast<Player*>(actor);
        p->SetHealth(p->GetHealth() + 10 * dt);
      }
        break;

      default:
        break;
    }

    levelMap_.IndexActor(actor);
  }

  for (auto& c : collisions_)
  {
    ProcessCollision_(c.first, c.second);
  }

  for (auto actor : deadActors_)
  {
    Actor* a = actor;
    KillActor_(a);
  }

  if (monsterCount < 5)
  {
    GenMonsters_();
  }

  QVariantMap tickMessage;
  tickMessage["tick"] = tick_;
  tickMessage["events"] = events_;
  tickMessage["ts"] = QDateTime::currentMSecsSinceEpoch();
  events_.clear();
  emit broadcastMessage(QString(QJsonDocument::fromVariant(tickMessage).toJson()));
  tick_++;
}

void GameServer::HandleSetUpConstants_(const QVariantMap& request, QVariantMap& response)
{
  QString* str = new QString("QString");

  if (!testingStageActive_
      || (QString)request["playerVelocity"].typeName() == str
      || (QString)request["slideThreshold"].typeName() == str
      || (QString)request["ticksPerSecond"].typeName() == str
      || (QString)request["screenRowCount"].typeName() == str
      || (QString)request["screenColumnCount"].typeName() == str
      || (QString)request["pickUpRadius"].typeName() == str)
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  playerVelocity_ = request["playerVelocity"].toFloat();
  slideThreshold_ = request["slideThreshold"].toFloat();
  ticksPerSecond_ = request["ticksPerSecond"].toInt();
  screenRowCount_ = request["screenRowCount"].toInt();
  screenColumnCount_ = request["screenColumnCount"].toInt();
  pickUpRadius_ = request["pickUpRadius"].toFloat();
}

void GameServer::HandleSetUpMap_(const QVariantMap& request, QVariantMap& response)
{
#define BAD_MAP(COND)\
  if (COND)\
  {\
    WriteResult_(response, EFEMPResult::BAD_MAP);\
    return;\
  }\

  if (!testingStageActive_)
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  auto rows = request["map"].toList();
  int rowCount = rows.size();
  BAD_MAP(rowCount == 0);

  int columnCount = rows[0].toList().size();
  BAD_MAP(columnCount == 0);

  levelMap_.Resize(columnCount, rowCount);

  for (int i = 0; i < rowCount; i++)
  {
    auto row = rows[i].toList();
    BAD_MAP(row.size() != columnCount);

    for (int j = 0; j < columnCount; j++)
    {
      int value = row[j].toByteArray()[0];
      BAD_MAP(value != '#' && value != '.');
      levelMap_.SetCell(j, i, value);
    }
  }

  actors_.clear ();
#undef BAD_MAP
}

void GameServer::HandleGetConst_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(request);

  response["playerVelocity"] = playerVelocity_;
  response["slideThreshold"] = slideThreshold_;
  response["ticksPerSecond"] = ticksPerSecond_;
  response["screenRowCount"] = screenRowCount_;
  response["screenColumnCount"] = screenColumnCount_;
  response["pickUpRadius"] = pickUpRadius_;
}

void GameServer::HandleLogin_(const QVariantMap& request, QVariantMap& response)
{
  auto login = request["login"].toString();
  auto password = request["password"].toString();
  UserData userData;
  if (!storage_.GetUser(login, userData))
  {
    WriteResult_(response, EFEMPResult::INVALID_CREDENTIALS);
    return;
  }

  QByteArray salt = QByteArray::fromBase64(userData.salt.toLatin1());
  QByteArray refPassHash = QByteArray::fromBase64(userData.pass.toLatin1());

  QByteArray passwordWithSalt = password.toUtf8();
  passwordWithSalt.append(salt);
  QByteArray passHash = QCryptographicHash::hash(passwordWithSalt,
    QCryptographicHash::Sha3_256);

  if (passHash != refPassHash)
  {
    WriteResult_(response, EFEMPResult::INVALID_CREDENTIALS);
    return;
  }

  Player* player = nullptr;
  QByteArray sid;

  bool virgin = userData.sid == "virgin";

  if (sidToPlayer_.find(userData.sid.toLatin1()) == sidToPlayer_.end())
  {
    do
    {
      QByteArray id = QString::number(qrand()).toLatin1();
      sid = QCryptographicHash::hash(id, QCryptographicHash::Sha1);
    } while (sidToPlayer_.find(sid) != sidToPlayer_.end());

    sid = sid.toHex();

    player = CreatePlayer_(login, userData.heroClass);
    sidToPlayer_.insert(sid, player);
    if (!virgin)
    {
      SetActorPosition_(player, Vector2(userData.x, userData.y));
    }
  }
  else
  {
    sid = userData.sid.toLatin1();
    player = *sidToPlayer_.find(sid);
  }
  auto p = player->GetPosition();
  storage_.UpdateUser(login, sid, p.x, p.y);

  response["sid"] = sid;
  response["webSocket"] = wsAddress_;
  response["fistId"] = static_cast<int>(ESpecId::FIST_ID);
  response["id"] = player->GetId();

  qDebug() << "Logged in, login: " << player->GetLogin();
}

void GameServer::HandleLogout_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(response);

  auto sid = request["sid"].toByteArray();
  auto it = sidToPlayer_.find(sid);
  if (it == sidToPlayer_.end())
  {
    qDebug() << "User with sid " << sid << " already logged out.";
    return;
  }

  Player* player = it.value();
  auto p = player->GetPosition();
  storage_.UpdateUser(player->GetLogin(), "logged-out", p.x, p.y);
  qDebug() << "Logged out, login: " << player->GetLogin();
  sidToPlayer_.erase(it);
  KillActor_(player);
}

void GameServer::HandleStartTesting_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(request);

  if (testingStageActive_)
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  storage_.Reset();
  testingStageActive_ = true;
}

void GameServer::HandleStopTesting_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(request);

  if (!testingStageActive_)
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  storage_.Reset();
  testingStageActive_ = false;
}

void GameServer::HandleGetDictionary_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(request);

  QVariantMap dictionary;
  dictionary["#"] = "wall";
  dictionary["."] = "grass";
  response["dictionary"] = dictionary;
}

void GameServer::HandleBeginMove_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(response);

  auto sid = request["sid"].toByteArray();
  unsigned tick = request["tick"].toUInt();
  auto direction = request["direction"].toString();

  Player* p = sidToPlayer_[sid];
  p->SetDirection(direction, true);
  p->SetClientTick(tick);
}

void GameServer::HandleLook_(const QVariantMap& request, QVariantMap& response)
{
  auto sid = request["sid"].toByteArray();
  Player* p = sidToPlayer_[sid];

  QVariantList rows;

  auto pos = p->GetPosition();
  response["x"] = pos.x;
  response["y"] = pos.y;

  int x = GridRound(pos.x);
  int y = GridRound(pos.y);

  int xDelta = (screenColumnCount_ - 1) / 2;
  int yDelta = (screenRowCount_ - 1) / 2;

  int minX = x - xDelta;
  int maxX = x + xDelta;
  int minY = y - yDelta;
  int maxY = y + yDelta;

  QVariantList actors;
  std::unordered_set<Actor*> actorsInArea;

  for (int j = minY; j <= maxY; j++)
  {
    QVariantList row;
    for (int i = minX; i <= maxX; i++)
    {
      row.push_back(QString(levelMap_.GetCell(i, j)));
      auto& actorsInCell = levelMap_.GetActors(i, j);
      for (auto& a: actorsInCell)
      {
        actorsInArea.insert(a);
      }
    }
    rows.push_back(row);
  }

  for (auto a : actorsInArea)
  {
    QVariantMap actor;
    actor["type"] = TypeToString[a->GetType()];
    actor["x"] = a->GetPosition().x;
    actor["y"] = a->GetPosition().y;
    actor["id"] = a->GetId();
    actor["size"] = a->GetSize();

    if (a->GetType() == EActorType::PLAYER)
    {
      actor["class"] = dynamic_cast<Player*>(a)->GetClass();
    }

    if (actor["type"] == "monster")
    {
      auto m = dynamic_cast<Monster*>(a);
      actor["mobType"] = m->GetName();
    }

    if (actor["type"] != "item"
        && actor["type"] != "projectile")
    {
      auto m = dynamic_cast<Creature*>(a);
      actor["health"] = m->GetHealth();
      actor["maxHealth"] = m->GetMaxHealth();
      actor["race"] = m->GetRace();
    }

    if (actor["type"] == "item")
    {
      actor["name"] = dynamic_cast<Item*>(a)->Getname();
    }

    if (actor["type"] == "projectile")
    {
      actor["name"] = "fireball_projectile";
    }

    actors << actor;
  }

  response["map"] = rows;
  response["actors"] = actors;
}

void GameServer::HandleEndMove_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(response);

  auto sid = request["sid"].toByteArray();
  unsigned tick = request["tick"].toUInt();
  auto direction = request["direction"].toString();

  Player* p = sidToPlayer_[sid];
  p->SetDirection(direction, false);
  p->SetClientTick(tick);
}

void GameServer::HandleSetLocation_(const QVariantMap& request, QVariantMap& response)
{
  Q_UNUSED(response);

  if (!request["x"].toFloat()
      || !request["y"].toFloat())
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }

  float x = request["x"].toFloat();
  float y = request["y"].toFloat();
  auto sid = request["sid"].toByteArray();
  Player* p = sidToPlayer_[sid];
  bool b = false;

  for (Actor* actor:actors_)
  {
    b = p == actor;
  }

  if (!b)
  {
    levelMap_.IndexActor(p);
    actors_.push_back(p);
  }

  p->SetSpeed(playerVelocity_);
  p->Stop();
  SetActorPosition_(p, Vector2(x,y));
}

void GameServer::HandleExamine_(const QVariantMap& request, QVariantMap& response)
{
  auto id = request["id"].toInt();
  if (!id
      || idToActor_.count(id) == 0)
  {
    WriteResult_(response, EFEMPResult::BAD_ID);
    return;
  }

  Actor* actor = idToActor_[id];
  response["type"] = TypeToString[actor->GetType()];
  if (actor->GetType() != EActorType::ITEM
      && actor->GetType() != EActorType::PROJECTILE)
  {
    auto m = dynamic_cast<Creature*>(actor);
    response["health"] = m->GetHealth();
    response["maxHealth"] = m->GetMaxHealth();
  }

  if (actor->GetType() == EActorType::MONSTER)
  {
    auto m = dynamic_cast<Monster*>(actor);
    response["mobType"] = m->GetName();
    response["race"] = m->GetRace();
    QVariantList items;

    for (auto& a : m->items)
    {
      QVariantMap item;
      item["id"] = a->GetId();
      item["name"] = a->Getname();
      item["type"] = a->GetTypeItem();
      item["class"] = a->GetClass();
      item["subtype"] = a->GetSubtype();
      item["weight"] = a->GetWeight();
      items << item;
    }

    response["inventory"] = items;

    QVariantMap stats;

    for (auto i = StringToStat.begin(); i != StringToStat.end(); i++)
    {
      stats[i.key()] = m->GetStatValue(i.value());
    }

    response["stats"] = stats;
  }

  if (actor->GetType() == EActorType::ITEM)
  {
    auto m = dynamic_cast<Item*>(actor);
    QVariantMap item;
    item["name"] = m->Getname();
    item["type"] = m->GetTypeItem();
    item["class"] = m->GetClass();
    item["subtype"] = m->GetSubtype();
    item["weight"] = m->GetWeight();
    response["item"] = item;
  }

  if (actor->GetType() == EActorType::PLAYER)
  {
    auto p = dynamic_cast<Player*>(actor);
    response["login"] = p->GetLogin();

    QVariantList items;
    for (auto& a : p->items)
    {
      QVariantMap item;
      item["id"] = a->GetId();
      item["name"] = a->Getname();
      item["type"] = a->GetTypeItem();
      item["class"] = a->GetClass();
      item["subtype"] = a->GetSubtype();
      item["weight"] = a->GetWeight();
      items << item;
    }

    response["inventory"] = items;

    QVariantMap slots_;

    for (auto i = EquipSlotToString.begin(); i != EquipSlotToString.end(); i++)
    {
      Item* item_ = p->GetSlot(i.value());
      if (item_
          && item_->GetId() != -1)
      {
          QVariantMap item;
          item["id"] = item_->GetId();
          item["name"] = item_->Getname();
          item["type"] = item_->GetTypeItem();
          item["class"] = item_->GetClass();
          item["subtype"] = item_->GetSubtype();
          item["weight"] = item_->GetWeight();
          slots_[i.key()] = item;
      }
    }
    response["slots"] = slots_;

    QVariantMap stats;
    for (auto i = StringToStat.begin(); i != StringToStat.end(); i++)
    {
      stats[i.key()] = p->GetStatValue(i.value());
    }
    response["stats"] = stats;
  }

  response["x"] = actor->GetPosition().x;
  response["y"] = actor->GetPosition().y;
  response["id"] = actor->GetId();
}

void GameServer::HandlePickUp_(const QVariantMap& request, QVariantMap& response)
{
  auto sid = request["sid"].toByteArray();
  Player* player = sidToPlayer_[sid];
  int id = request["id"].toInt();
  Item* item = dynamic_cast<Item*>(idToActor_[id]);

  if (!id
      || !item
      || !item->GetOnTheGround())
  {
    WriteResult_(response, EFEMPResult::BAD_ID);
    return;
  }

  int totalWeight = player->GetTotalWeigh();
  float carryingCapacity = player->GetCarryingSapacity();
  int weight = item->GetWeight();

  if (totalWeight + weight >= carryingCapacity)
  {
    WriteResult_(response, EFEMPResult::TOO_HEAVY);
    return;
  }

  Vector2 player_pos = player->GetPosition();
  Vector2 item_pos = item->GetPosition();

  float distance2 = Sqr(player_pos.x - item_pos.x)
                    + Sqr(player_pos.y - item_pos.y);
  if (distance2 > Sqr(pickUpRadius_))
  {
    WriteResult_(response, EFEMPResult::BAD_ID);
    return;
  }

  item->SetOnTheGround(false);
  levelMap_.RemoveActor(item);
  actors_.erase(std::remove(actors_.begin(), actors_.end(), item), actors_.end());
  //idToActor_.erase(id);
  player->items.push_back(dynamic_cast<Item*>(item));
}

void GameServer::HandleUnequip_(const QVariantMap& request, QVariantMap& response)
{
  if (request["slot"].toString() == ""
      || EquipSlotToString.find(request["slot"].toString()) == EquipSlotToString.end())
  {
    WriteResult_(response, EFEMPResult::BAD_SLOT);
    return;
  }

  auto sid = request["sid"].toByteArray();
  Player* player = sidToPlayer_[sid];
  ESlot slot = EquipSlotToString[request["slot"].toString()];

  Item* item = player->GetSlot(slot);
  if (!item)
  {
    WriteResult_(response, EFEMPResult::BAD_ID);
    return;
  }

  player->items.push_back(item);
  player->SetSlot(slot);
  player->SetStat(false, item);
}

void GameServer::HandleUse_(const QVariantMap& request, QVariantMap& response)
{
  auto sid = request["sid"].toByteArray();
  Player* p = sidToPlayer_[sid];

  if (!request["id"].toInt())
  {
    WriteResult_(response, EFEMPResult::BAD_ID);
    return;
  }

  int id = request["id"].toInt();

  if (!request["x"].toFloat()
      || !request["y"].toFloat())
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }

  float x = request["x"].toFloat();
  float y = request["y"].toFloat();
  Vector2 at = Vector2(x, y);

  // Looks like this check here is for not casting attack too far from caster
  if ((at - p->GetPosition()).Length() > 1.2f)
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }

  ESpecId specId = ESpecId::UNDEFINED;

  if (id < 0)
  {
    specId = static_cast<ESpecId>(id);
  }

  switch (specId)
  {
    case ESpecId::FIST_ID:
    {
      // TODO: replace this with creating an `attack object` which deal damage
      // and live for about a frame
      for (Actor* actor : actors_)
      {
        if (actor->GetType() == EActorType::MONSTER)
        {
          Creature* target = static_cast<Creature*>(actor);
          if (p->GetId() != target->GetId()
              && target->GetHealth() > 0)
          {
            Box targetBox(target->GetPosition(), target->GetSize() * 0.5f);
            if (targetBox.Inside(at))
            {
              events_ << p->attack(target, id);

              if (target->GetHealth() <= 0)
              {
                GetItems(target);
                p->SetExperience(p->GetExperience () + 300);
                int lev = p->GetLevel();
                p->SetLevel(p->GetExperience() / 1000);
                if (lev < p->GetLevel())
                {
                  p->AddStat();
                  p->UpdateStat();
                }
              }
              else
              {
                events_ << target->attack(p);
              }
              WriteResult_(response, EFEMPResult::OK);
              return;
            }
          }
        }
      }
    }
      break;

    case ESpecId::BOW_ID:
      break;

    default:
      break;
  }
}

void GameServer::HandleUseSkill_(const QVariantMap& request, QVariantMap& response)
{
  auto sid = request["sid"].toByteArray();
  Player* p = sidToPlayer_[sid];

  float x = request["x"].toFloat();
  float y = request["y"].toFloat();

  if (!x || !y)
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }
  Projectile* projectile = CreateActor_<Projectile>();
  SetActorPosition_(projectile, Vector2(p->GetPosition().x, p->GetPosition().y));
  projectile->SetPoint(Vector2(x, y));
  projectile->SetPlayer(p);
  // Was not indexed in level map properly
  projectile->GetCoord();
  projectile->SetDirection(EActorDirection::EAST, true);
  WriteResult_(response, EFEMPResult::OK);
  return;
}

void GameServer::HandleDrop_(const QVariantMap& request, QVariantMap& response)
{
  int id = request["id"].toInt();
  if (!id)
  {
    WriteResult_(response, EFEMPResult::BAD_ID);
    return;
  }

  auto sid = request["sid"].toByteArray();
  Player* p = sidToPlayer_[sid];

  if (p->DropItemFromSlot(id))
  {
    WriteResult_(response, EFEMPResult::OK);
    return;
  }

  for (auto& item: p->items)
  {
    if (item->GetId() == id)
    {
      //idToActor_[item->GetId()] = item;
      actors_.push_back(item);
      SetActorPosition_(item, p->GetPosition());
      item->SetOnTheGround(true);
      p->items.erase(std::remove(p->items.begin(), p->items.end(), item)
                    , p->items.end());
      WriteResult_(response, EFEMPResult::OK);
      return;
    }
  }
  WriteResult_(response, EFEMPResult::BAD_ID);
}

void GameServer::HandleEquip_(const QVariantMap& request, QVariantMap& response)
{
#define BAD_ID(COND)\
  if (COND)\
  {\
    WriteResult_(response, EFEMPResult::BAD_ID);\
    return;\
  }\

  BAD_ID(request.find("id") == request.end());
  BAD_ID(!request["id"].toInt());

  QString slot = request["slot"].toString();
  if (EquipSlotToString.find(slot) == EquipSlotToString.end())
  {
    WriteResult_(response, EFEMPResult::BAD_SLOT);
    return;
  }

  int id = request["id"].toInt();
  auto sid = request["sid"].toByteArray();
  Player* p = sidToPlayer_[sid];

  BAD_ID((idToActor_.find(id) == idToActor_.end()) && !p->GetItemId(id));

  if (p->GetItemId(id))
  {
    //equip item from inventory
    for (auto& item: p->items)
    {
      if (item->GetId() == id)
      {
        Item* i = p->GetSlot(EquipSlotToString[slot]);
        if (i)
        {
          p->items.push_back(i);
        }
        if (!p->SetSlot(EquipSlotToString[slot], item))
        {
          WriteResult_(response, EFEMPResult::BAD_SLOT);
          return;
        }
        p->SetStat(true, item);
        p->items.erase(std::remove(p->items.begin(), p->items.end(), item), p->items.end());

        WriteResult_(response, EFEMPResult::OK);
        return;
      }
    }
    BAD_ID(true);
  }
  else
  {
    //item is on the ground
    Item* item = dynamic_cast<Item*>(idToActor_[id]);
    BAD_ID(!item);
    Vector2 player_pos = p->GetPosition();
    Vector2 item_pos = item->GetPosition();
    float distance2 = Sqr(player_pos.x - item_pos.x) + Sqr(player_pos.y - item_pos.y);

    BAD_ID(distance2 > Sqr(pickUpRadius_))
    if (!p->SetSlot(EquipSlotToString[slot], item))
    {
      WriteResult_(response, EFEMPResult::BAD_SLOT);
      return;
    }
    p->SetStat(true, item);
    //KillActor_(item); ???
    idToActor_.erase(item->GetId());
    actors_.erase(std::remove(actors_.begin(), actors_.end(), item), actors_.end());
  }

#undef BAD_ID
}

void GameServer::HandlePutItem_(const QVariantMap& request, QVariantMap& response)
{
  if (!testingStageActive_)
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  if (!request["x"].toFloat() || !request["y"].toFloat())
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }

  float x = request["x"].toFloat();
  float y = request["y"].toFloat();

  if (levelMap_.GetCell(x, y) != '.')
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }

  Item* item = CreateActor_<Item>();
  SetActorPosition_(item, Vector2(x, y));
  SetItemDescription(request["item"].toMap(), item);
  response["id"] = item->GetId();
}

void GameServer::HandlePutMob_(const QVariantMap& request, QVariantMap& response)
{
  if (!testingStageActive_)
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  if (!request["x"].toFloat()
      || !request["y"].toFloat())
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }

  float x = request["x"].toFloat();
  float y = request["y"].toFloat();

  Monster* monster = CreateActor_<Monster>();
  SetActorPosition_(monster, Vector2(x, y));

  monster->SetDirection(EActorDirection::SOUTH, true);

  auto flags = request["flags"].toList();
  for (auto flag: flags)
  {
    if (monster->possibleFlags.lastIndexOf(flag.toString()) == -1)
    {
      WriteResult_(response, EFEMPResult::BAD_FLAG);
      return;
    }
     monster->Flags.push_back(flag.toString());
  }

  monster->SetRace(request["race"].toString());
  if (monster->GetRace() == "NONE")
  {
    WriteResult_(response, EFEMPResult::BAD_RACE);
    return;
  }

  auto stats = request["stats"].toMap();
  for (auto s = stats.begin(); s != stats.end(); s++)
  {
    EStatConst stat = StringToStat[s.key()];
    QVariant val = s.value();
    monster->SetStat(stat, val.toFloat());
  }

  auto inventory = request["inventory"].toList();
  for (auto elem: inventory)
  {
    Item* item = CreateActor_<Item>();
    SetItemDescription(elem.toMap(), item);
    item->SetOnTheGround(false);
    monster->items.push_back(item);
    actors_.erase(std::remove(actors_.begin(), actors_.end(), item)
                , actors_.end()); //???
  }

  QStringList damage;
  damage << request["dealtDamage"].toString().split("d");

  if (damage.size() < 2
      || !damage[0].toInt()
      || !damage[1].toInt())
  {
    WriteResult_(response, EFEMPResult::BAD_DAMAGE);
    return;
  }

  response["id"] = monster->GetId();
}

void GameServer::HandlePutPlayer_(const QVariantMap& request, QVariantMap& response)
{
  if (!testingStageActive_)
  {
    WriteResult_(response, EFEMPResult::BAD_ACTION);
    return;
  }

  if (!request["x"].toFloat() || !request["y"].toFloat())
  {
    WriteResult_(response, EFEMPResult::BAD_PLACING);
    return;
  }

  float x = request["x"].toFloat();
  float y = request["y"].toFloat();

  Player* player = CreateActor_<Player>();
  SetActorPosition_(player, Vector2(x, y));

  auto inventory = request["inventory"].toList();
  for (auto elem: inventory)
  {
    Item* item = CreateActor_<Item>();
    SetItemDescription(elem.toMap(), item);
    item->SetOnTheGround(false);
    player->items.push_back(item);
    actors_.erase(std::remove(actors_.begin(), actors_.end(), item), actors_.end());
    //idToActor_.erase(item->GetId());
  }

  auto stats = request["stats"].toMap();
  for (auto s = stats.begin(); s != stats.end(); s++)
  {
    EStatConst stat = StringToStat[s.key()];
    QVariant val = s.value();
    player->SetStat(stat, val.toFloat());
  }

  if (stats.size() == 0)
  {
    player->SetSpeed(playerVelocity_);
  }

  QVariantList items;
  for (auto& elem: player->items)
  {
    QVariantMap item;
    item["id"] = elem->GetId();
    item["name"] = elem->Getname();
    item["type"] = elem->GetTypeItem();
    item["class"] = elem->GetClass();
    item["subtype"] = elem->GetSubtype();
    item["weight"] = elem->GetWeight();
    items << item;
  }
  response["inventory"] = items;

  auto slot = request["slots"].toMap();
  QVariantMap id_slot;
  for (auto i = EquipSlotToString.begin(); i != EquipSlotToString.end(); i++)
  {
    if (slot.find(i.key()) != slot.end())
    {
      Item* item = CreateActor_<Item>();
      SetItemDescription(slot[i.key()].toMap(), item);
      player->items.push_back(item);
      player->SetSlot(i.value(), item);
      player->SetStat(true, item);
      id_slot[i.key()] = item->GetId();
    }
  }
  response["slots"] = id_slot;
  response["id"] = player->GetId();

  QByteArray sid;
  do
  {
    QByteArray id = QString::number(qrand()).toLatin1();
    sid = QCryptographicHash::hash(id, QCryptographicHash::Sha1);

  } while (sidToPlayer_.find(sid) != sidToPlayer_.end());
  sid = sid.toHex();

  sidToPlayer_.insert(sid, player);
  response["sid"] = sid;
  response["fistId"] = static_cast<int>(ESpecId::FIST_ID);
}

void GameServer::HandleEnforce_(const QVariantMap &request, QVariantMap &response)
{
  QVariantMap res;
  QVariantMap req;
  req = QVariantMap(request["enforcedAction"].toMap());
  handleFEMPRequest(req, res);
  response["actionResult"] = res;
  //qDebug() << req["action"].toString();
  //qDebug() << res;
  //qDebug() << response;
}


void GameServer::WriteResult_(QVariantMap& response, const EFEMPResult result)
{
  response["result"] = fempResultToString[static_cast<unsigned>(result)];
}

void GameServer::LoadLevelFromImage_(const QString filename)
{
  QFile levelImage(filename);
  if (levelImage.exists())
  {
    QImage map;
    map.load(filename, "png");
    levelMap_.Resize(map.width(), map.height());
    for (int i = 0; i < map.height(); i++)
    {
      for (int j = 0; j < map.width(); j++)
      {
        auto color = map.pixel(j, i);
        int summ = qRed(color) + qGreen(color) + qBlue(color);
        int value = summ > (255 * 3 / 2) ? '.' : '#';
        levelMap_.SetCell(j, i, value);
      }
    }
  }
}

void GameServer::GenMonsters_()
{
  int monsterCounter = 0;
  for (int i = 0; i < levelMap_.GetRowCount(); i++)
  {
    for (int j = 0; j < levelMap_.GetColumnCount(); j++)
    {
      if (levelMap_.GetCell(j, i) == '.')
      {
        monsterCounter++;
        if (monsterCounter % 10 == 0)
        {
          Monster* monster = CreateActor_<Monster>();
          monster->SetType(EActorType::MONSTER);
          Monster& m = *monster;
          SetActorPosition_(monster, Vector2(j + 0.5f, i + 0.5f));
          storage_.GetMonster(monster, monster->GetId() % 32 + 1);
        }
      }
    }
  }
}

Player* GameServer::CreatePlayer_(const QString login, const QString heroClass)
{
  Player* player = CreateActor_<Player>();
  Player& p = *player;
  p.SetLogin(login);

  int x = 0;
  int y = 0;
  int c = 10;
  int r = 10;

  while (true)
  {
    if (levelMap_.GetCell(c, r) == '.')
    {
      x = c;
      y = r;
      break;
    }
    c++;
    if (c >= levelMap_.GetColumnCount())
    {
      c = 0;
      r++;
      if (r >= levelMap_.GetRowCount())
      {
        break;
      }
    }
  }
  player->SetSpeed(playerVelocity_);
  player->SetClass(heroClass);
  SetActorPosition_(player, Vector2(x + 0.5f, y + 0.5f));

  return player;
}

void GameServer::GetItems(Creature* actor)
{
  if (actor->GetType() == EActorType::PLAYER)
  {
    for(Item* item : dynamic_cast<Player*>(actor)->items)
    {
      SetActorPosition_(item, actor->GetPosition());
      actors_.push_back(item);
    }
  }
  else
  {
    Item* item = CreateActor_<Item>();
    SetActorPosition_(item, actor->GetPosition());
    //storage_.GetItem(item, 22);
    storage_.GetItem(item, (item->GetId() % 31) + 1);
  }
}

void GameServer::SetActorPosition_(Actor* actor, const Vector2& position)
{
  levelMap_.RemoveActor(actor);
  actor->SetPosition(position);
  levelMap_.IndexActor(actor);
}

void GameServer::SetItemDescription(const QVariantMap& request, Item* item)
{
  item->SetSubtype(request["subtype"].toString());
  item->SetClass(request["class"].toString());
  item->SetTypeItem(request["type"].toString());
  item->SetWeight(request["weight"].toInt());

  //set bonuses
  auto bonuses_ = request["bonuses"].toList();
  for (auto i = bonuses_.begin(); i != bonuses_.end(); i++)
  {
    auto elem = (*i).toMap();
    auto stat = elem["stat"].toString();
    QMap <QString, QVariant> m;
    m["effectCalculation"] = elem["effectCalculation"].toString();
    m["value"] = elem["value"];
    item->bonuses[StringToStat[stat]] = m;
  }
}

void GameServer::FindCollisions_(Actor* actor, float dt)
{

  auto p = actor->GetPosition();
  float halfSize = actor->GetSize() * 0.5f;

  for (auto& i : {0, 1})
  {

    // TODO: move collecting total velocity on actor outside
    float d = actor->GetDirectionVector()[i] * playerVelocity_ * dt;
    auto s = Sign(d);
    float front = p[i] + s * halfSize;
    int c[2];
    bool wallHit = false;
    Actor* hitActor = nullptr;
    c[!i] = GridRound(p[!i] - halfSize);
    // iterate over cells between two corners of actor's sqare
    for (; c[!i] != GridRound(p[!i] + halfSize) + 1; c[!i]++)
  {
      c[i] = GridRound(front);
      // iterate over all grid cells crossed by current corner
      for (; !hitActor && !wallHit && c[i] != GridRound(front + d) + s; c[i] += s)
      {
        // clamp movement amount if crossed a solid grid cell
        if (levelMap_.GetCell(c[0], c[1]) != '.')
        {
          // distance from front to current cell's nearest edge
          float du = c[i] + (d < 0) - front - s * epsilon_;
          if (Abs(du) < Abs(d))
          {
            d = du;
            wallHit = true;
          }
        }
        else
        {
          // there may be other actors in this cell
          // FIXME: assure there is no duplicate pairs of colliding actors
          auto& actors = levelMap_.GetActors(c[0], c[1]);
          for (auto a : actors)
          {
            Vector2 ap = a->GetPosition();
            float aHalfSize = a->GetSize() * 0.5f;
            float da = ap[i] - front - s * (aHalfSize + epsilon_);
            // TODO: check for actors solidity
            if (ap[!i] + aHalfSize > p[!i] - halfSize
                && ap[!i] - aHalfSize < p[!i] + halfSize
                && Abs(da) < Abs(d))
            {
              d = da;
              hitActor = a;
            }
          }
        }
      }
    }
    if (hitActor != nullptr)
    {
      // TODO: add info about collision e.g. normal and penetration depth
      // TODO: track collisions with walls same way
      AddCollidedPair_(actor, hitActor);
    }
    // apply movement along current axis
    p[i] += d;
  }
  actor->SetPosition(p);
}

void GameServer::AddCollidedPair_(Actor* lhs, Actor* rhs)
{
  int minId = std::min(lhs->GetId(), rhs->GetId());
  int maxId = std::max(lhs->GetId(), rhs->GetId());
  quint64 idProduct = minId * lastId_ + maxId;
  if (collisionPairUniqueness_.find(idProduct) == collisionPairUniqueness_.end())
  {
    collisionPairUniqueness_.insert(idProduct);
  }
  else
  {
    qDebug() << "Duplicate collision: " << minId << " vs. " << maxId;
    return;
  }
  collisions_.push_back(std::make_pair(lhs, rhs));
}

void GameServer::ProcessCollision_(Actor* lhs, Actor* rhs)
{
  Player* player = nullptr;
  Item* item = nullptr;

  if (lhs->GetType() == EActorType::PLAYER)
  {
    player = static_cast<Player*>(lhs);
  }
  else if (lhs->GetType() == EActorType::ITEM)
  {
    item = static_cast<Item*>(lhs);
  }
  if (rhs->GetType() == EActorType::ITEM)
  {
    item = static_cast<Item*>(rhs);
  }
  else if (rhs->GetType() == EActorType::PLAYER)
  {
    player = static_cast<Player*>(player);
  }

  if (item != nullptr
      && player != nullptr
      && deadActors_.count(item) ==0)
  {
    deadActors_.insert(item);
    QVariantMap pUpTaken;
    pUpTaken["event"] = "bonus";
    pUpTaken["id"] = player->GetId();
    player->SetHealth(player->GetHealth() + 100);
    events_ << pUpTaken;
  }
}
