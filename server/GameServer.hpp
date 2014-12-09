#pragma once

#include <unordered_set>

#include <QObject>
#include <QMap>
#include <QVariantMap>
#include <QTimer>
#include <QTime>

#include "LevelMap.hpp"
#include "PermaStorage.hpp"
#include "Player.hpp"
#include "Monster.hpp"
#include "Projectile.hpp"

enum class EFEMPResult
{
  OK,
  BAD_SID,
  BAD_PASS,
  BAD_LOGIN,
  LOGIN_EXISTS,
  INVALID_CREDENTIALS,
  BAD_ID,
  BAD_ACTION,
  BAD_MAP,
  BAD_SLOT,
  BAD_PLACING,
  BAD_RACE,
  BAD_FLAG,
  BAD_DAMAGE,
  TOO_HEAVY,
  BAD_CLASS,
};

const std::vector<QString> fempResultToString =
{
  [EFEMPResult::OK] = "ok",
  [EFEMPResult::BAD_SID] = "badSid",
  [EFEMPResult::BAD_PASS] = "badPassword",
  [EFEMPResult::BAD_LOGIN] = "badLogin",
  [EFEMPResult::LOGIN_EXISTS] = "loginExists",
  [EFEMPResult::INVALID_CREDENTIALS] = "invalidCredentials",
  [EFEMPResult::BAD_ID] = "badId",
  [EFEMPResult::BAD_ACTION] = "badAction",
  [EFEMPResult::BAD_MAP] = "badMap",
  [EFEMPResult::BAD_SLOT] = "badSlot",
  [EFEMPResult::BAD_PLACING] = "badPlacing",
  [EFEMPResult::BAD_RACE] = "badRace",
  [EFEMPResult::BAD_FLAG] = "badFlag",
  [EFEMPResult::BAD_DAMAGE] = "badDamage",
  [EFEMPResult::TOO_HEAVY] = "tooHeavy",
  [EFEMPResult::BAD_CLASS] = "badClass",
};

class GameServer : public QObject
{
  Q_OBJECT

signals:
  void broadcastMessage(QString message);

public:
  GameServer();
  virtual ~GameServer();

  bool Start();
  void Stop();

public slots:
  void handleFEMPRequest(const QVariantMap& request, QVariantMap& response);
  void setWSAddress(QString address);
  void tick();

private:
  // Request Handlers
//==============================================================================
  typedef void (GameServer::*HandlerType)(const QVariantMap& request, QVariantMap& response);
  QMap<QString, HandlerType> requestHandlers_ =
  {
    // Testing
    {"startTesting", &GameServer::HandleStartTesting_},
    {"stopTesting", &GameServer::HandleStopTesting_},
    {"setUpConst", &GameServer::HandleSetUpConstants_},
    {"setUpMap", &GameServer::HandleSetUpMap_},
    {"getConst", &GameServer::HandleGetConst_},
    {"putItem", &GameServer::HandlePutItem_},
    {"putMob", &GameServer::HandlePutMob_},
    {"putPlayer", &GameServer::HandlePutPlayer_},
    {"setLocation", &GameServer::HandleSetLocation_},
    // Authorization
    {"login", &GameServer::HandleLogin_},
    {"logout", &GameServer::HandleLogout_},
    {"register", &GameServer::HandleRegister_},
    // Game Interaction
    {"destroyItem", &GameServer::HandleDestroyItem_},
    {"examine", &GameServer::HandleExamine_},
    {"getDictionary", &GameServer::HandleGetDictionary_},
    {"look", &GameServer::HandleLook_},
    {"beginMove", &GameServer::HandleBeginMove_},
    {"endMove", &GameServer::HandleEndMove_},
    {"pickUp", &GameServer::HandlePickUp_},
    {"unequip", &GameServer::HandleUnequip_},
    {"use", &GameServer::HandleUse_},
    {"drop", &GameServer::HandleDrop_},
    {"equip", &GameServer::HandleEquip_},
    {"enforce", &GameServer::HandleEnforce_},
    {"useSkill", &GameServer::HandleUseSkill_},
  };

  void HandleStartTesting_(const QVariantMap& request, QVariantMap& response);
  void HandleStopTesting_(const QVariantMap& request, QVariantMap& response);
  void HandleSetUpConstants_(const QVariantMap& request, QVariantMap& response);
  void HandleSetUpMap_(const QVariantMap& request, QVariantMap& response);
  void HandleGetConst_(const QVariantMap& request, QVariantMap& response);
  void HandlePutItem_(const QVariantMap& request, QVariantMap& response);
  void HandlePutMob_(const QVariantMap& request, QVariantMap& response);
  void HandlePutPlayer_(const QVariantMap& request, QVariantMap& response);
  void HandleEnforce_(const QVariantMap& request, QVariantMap& response);
  void HandleSetLocation_(const QVariantMap& request, QVariantMap& response);

  void HandleLogin_(const QVariantMap& request, QVariantMap& response);
  void HandleLogout_(const QVariantMap& request, QVariantMap& response);
  void HandleRegister_(const QVariantMap& request, QVariantMap& response);

  void HandleDestroyItem_(const QVariantMap& request, QVariantMap& response);
  void HandleExamine_(const QVariantMap& request, QVariantMap& response);
  void HandleGetDictionary_(const QVariantMap& request, QVariantMap& response);
  void HandleLook_(const QVariantMap& request, QVariantMap& response);
  void HandleBeginMove_(const QVariantMap& request, QVariantMap& response);
  void HandleEndMove_(const QVariantMap& request, QVariantMap& response);
  void HandlePickUp_(const QVariantMap& request, QVariantMap& response);
  void HandleUnequip_(const QVariantMap& request, QVariantMap& response);
  void HandleUse_(const QVariantMap& request, QVariantMap& response);
  void HandleUseSkill_(const QVariantMap& request, QVariantMap& response);
  void HandleDrop_(const QVariantMap& request, QVariantMap& response);
  void HandleEquip_(const QVariantMap& request, QVariantMap& response);
//==============================================================================

  void WriteResult_(QVariantMap& response, const EFEMPResult result);

  void LoadLevelFromImage_(const QString filename);
  void GenMonsters_();
  void GetItems(Creature* actor);
  Player* CreatePlayer_(const QString login, const QString heroClass);
  void SetActorPosition_(Actor* actor, const Vector2& position);
  void SetItemDescription(const QVariantMap &request, Item* item);
  bool IsPositionWrong(float x, float y, Actor *actor);
  bool CollideWithGrid_(Actor* actor);

  template <typename T>
  T* CreateActor_();

  template <typename T>
  void KillActor_(T*& actor);

  int lastId_ = 1;

  std::vector<Actor*> actors_;
  std::unordered_map<int, Actor*> idToActor_;
  QMap<QByteArray, Player*> sidToPlayer_;

  LevelMap levelMap_;

  QString wsAddress_;

  PermaStorage storage_;

  QTimer* timer_ = nullptr;
  QTime time_;
  float lastTime_ = 0.0f;
  unsigned tick_ = 0;

  QVariantList events_;

  float playerVelocity_ = 4.0;
  float slideThreshold_ = 0.24;
  int ticksPerSecond_ = 60;
  int screenRowCount_ = 7;
  int screenColumnCount_ = 9;
  float epsilon_ = 0.00001;
  float pickUpRadius_ = 1.5f;

  int FistId_ = -5;

  bool testingStageActive_ = false;

  const std::unordered_set<std::string> sidCheckExceptions_ =
  {
    "register",
    "login",
    // testing
    "startTesting",
    "stopTesting",
    "setUpConst",
    "setUpMap",
    "getConst",
    "putItem",
    "putMob",
    "putPlayer",
    "setLocation",
  };

  QMap <QString, ESlot> EquipSlotToString =
  {
    {"ammo", ESlot::AMMO},
    {"body", ESlot::BODY},
    {"feet", ESlot::FEET},
    {"forearm", ESlot::FOREARM},
    {"head", ESlot::HEAD},
    {"left-finger", ESlot::LEFT_FINGER},
    {"left-hand", ESlot::LEFT_HAND},
    {"neck", ESlot::NECK},
    {"right-finger", ESlot::RIGHT_FINGER},
    {"right-hand", ESlot::RIGHT_HAND}
  };

  QMap <QString, EStatConst> StringToStat =
  {
    {"STRENGTH", EStatConst::STRENGTH},
    {"INTELLIGENCE", EStatConst::INTELLIGENCE},
    {"DEXTERITY", EStatConst::DEXTERITY},
    {"SPEED", EStatConst::SPEED},
    {"DEFENSE", EStatConst::DEFENSE},
    {"MAGIC_RESISTANCE", EStatConst::MAGIC_RESISTANCE},
    {"CAPACITY", EStatConst::CAPACITY},
    {"HP", EStatConst::HP},
    {"MAX_HP", EStatConst::MAX_HP},
    {"MP", EStatConst::MP},
    {"MAX_MP", EStatConst::MAX_MP}
  };

  QMap <EActorType, QString> TypeToString =
  {
    {EActorType::MONSTER, "monster"},
    {EActorType::PLAYER, "player"},
    {EActorType::ITEM, "item"},
    {EActorType::PROJECTILE, "projectile"},
    {EActorType::undefined, "undefined"},
  };

  QMap<QString, QString> Hates =
  {
    {"HATE_ORC", "ORC"},
    {"HATE_EVIL", "EVIL"},
    {"HATE_TROLL", "TROLL"},
    {"HATE_GIANT", "GIANT"},
    {"HATE_DEMON", "DEMON"},
    {"HATE_METAL", "METAL"},
    {"HATE_PLAYER", "PLAYER"},
    {"HATE_DRAGON", "DRAGON"},
    {"HATE_UNDEAD", "UNDEAD"},
    {"HATE_ANIMAL", "ANIMAL"}
  };
};

template <typename T>
T* GameServer::CreateActor_()
{
  T* actor = new T();
  actor->SetId(lastId_);
  lastId_++;
  idToActor_[actor->GetId()] = actor;
  levelMap_.IndexActor(actor);
  actors_.push_back(actor);
  return actor;
}

template <typename T>
void GameServer::KillActor_(T*& actor)
{
  idToActor_.erase(actor->GetId());
  levelMap_.RemoveActor(actor);
  actors_.erase(std::remove(actors_.begin(), actors_.end(), actor), actors_.end());
  delete actor;
  actor = nullptr;
}
