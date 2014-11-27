#pragma once

#include <QString>
#include <QVector>

#include "Creature.hpp"
#include "Item.hpp"

enum class ESlot
{
  AMMO,
  HEAD,
  NECK,
  BODY,
  FOREARM,
  LEFT_HAND,
  RIGHT_HAND,
  LEFT_FINGER,
  RIGHT_FINGER,
  FEET,
};

enum class EHeroClass
{
  MAGE,
  ROGUE,
  WARRIOR,
};

class Player : public Creature
{
public:
  Blow blows;
  QVector<Item*> items;

  Player();
  virtual ~Player();

  QString GetLogin() const;
  void SetLogin(const QString login);

  unsigned GetClientTick() const;
  void SetClientTick(const unsigned clientTick);

  Item* GetSlot(ESlot st);
  bool SetSlot(ESlot st, Item* item);
  bool SetSlot(ESlot st);

  void SetBlows();
  void SetExperience(int exp);
  int GetExperience();

  void SetClass(QString clas);
  QString GetClass();

  void SetLevel(int lev);
  int GetLevel();

  void SetDamage(QString str, bool b);
  void AddStat();
  void UpdateStat();

  bool GetItemId (int id);

  int GetTotalWeigh();

  bool DropItemFromSlot(int);

  virtual void SetRace();

  virtual QVariantMap atack(Creature* actor, int id);

private:
  QString login_;
  unsigned clientTick_ = 0;
  QMap<ESlot, Item*> slots_;
  int experience_ = 0;
  int level_ = 1;
  EHeroClass heroClass_;
};
