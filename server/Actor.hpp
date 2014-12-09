#pragma once

#include <unordered_map>
#include <QString>
#include "2de_Vector2.h"
using namespace Deku2D;

enum class EActorDirection
{
  NORTH,
  EAST,
  SOUTH,
  WEST,
  NONE,
};

enum class EStatConst
{
  STRENGTH,
  INTELLIGENCE,
  DEXTERITY,
  SPEED,
  DEFENSE,
  MAGIC_RESISTANCE,
  CAPACITY,
  HP,
  MAX_HP,
  MP,
  MAX_MP,
};



struct Damage
{
  int count;
  int to;
};

const std::vector<Vector2> directionToVector =
{
//  [EActorDirection::NONE] = Vector2(0.0f, 0.0f),
  [EActorDirection::NORTH] = Vector2(0.0f, -1.0f),
  [EActorDirection::EAST] = Vector2(1.0f, 0.0f),
  [EActorDirection::SOUTH] = Vector2(0.0f, 1.0f),
  [EActorDirection::WEST] = Vector2(-1.0f, 0.0f),
};

enum class EActorType
{
  undefined,
  MONSTER,
  PLAYER,
  ITEM,
  PROJECTILE,
};

class Actor
{
public:
  Actor();
  virtual ~Actor();

  Vector2 GetPosition() const;
  void SetPosition(const Vector2& position);

  Vector2 GetVelocity() const;
  void SetVelocity(const Vector2& velocity);

  Vector2 GetDirectionVector() const;
  void SetDirection(const QString direction, bool value);
  void SetDirection(const EActorDirection direction, bool value);
  void Stop();

  float GetSize() const;
  void SetSize(const float size);

  EActorType GetType() const;
  void SetType(EActorType type);

  int GetId() const;
  void SetId(int id);

  virtual void Update(float dt);
  virtual void OnCollideWorld();
  virtual bool OnCollideActor(Actor* actor);
  virtual std::vector<std::pair<int, int>> GetOccupiedCells() const;

protected:
  Vector2 position_ = Const::Math::V2_ZERO;
  Vector2 velocity_ = Const::Math::V2_ZERO;
  bool directions_[4] = {false, false, false, false};
  float size_ = 7.0f / 8.0f;
  int id_ = -1;
  EActorType type_ = EActorType::undefined;
};

