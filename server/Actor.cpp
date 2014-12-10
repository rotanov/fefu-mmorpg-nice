#include "Actor.hpp"

#include <unordered_map>
#include <string>
#include <QDebug>

#include "utils.hpp"

Actor::Actor()
{

}

Actor::~Actor()
{

}

void Actor::SetPosition(const Vector2& position)
{
  position_ = position;
}

Vector2 Actor::GetVelocity() const
{
  return velocity_;
}

void Actor::SetVelocity(const Vector2& velocity)
{
  velocity_ = velocity;
}

Vector2 Actor::GetPosition() const
{
  return position_;
}

Vector2 Actor::GetDirectionVector() const
{
  Vector2 r = Deku2D::Const::Math::V2_ZERO;

  for (int i = 0; i < 4; i++)
  {
    if (directions_[i])
    {
      r += directionToVector[i];
    }
  }

  if (r.x * r.y != 0.0f)
  {
    r.Normalize();
  }
  return r;
}

void Actor::SetDirection(const QString direction, bool value)
{
  static std::unordered_map<std::string, EActorDirection> stringToDirection =
  {
    { "north", EActorDirection::NORTH },
    { "east", EActorDirection::EAST },
    { "south", EActorDirection::SOUTH },
    { "west", EActorDirection::WEST },
  };

  auto it = stringToDirection.find(direction.toStdString());
  if (it != stringToDirection.end())
  {
    directions_[static_cast<int>(it->second)] = value;
  }
}

void Actor::SetDirection(const EActorDirection direction, bool value)
{
  directions_[static_cast<int>(direction)] = value;
}

void Actor::Stop()
{
  for (int i = 0; i < 4; i++)
  {
    directions_[i] = false;
  }
}

float Actor::GetSize() const
{
  return size_;
}

void Actor::SetSize(const float size)
{
  size_ = size;
}

void Actor::Update(float dt)
{
  // TODO: remove integrating over time from Update all over Actor hierarchy
  position_ += velocity_ * dt;
}

int Actor::GetId() const
{
  return id_;
}

void Actor::SetId(int id)
{
  id_ = id;
}

void Actor::OnCollideWorld()
{
  Stop();
}

bool Actor::OnCollideActor(Actor* /*actor*/)
{
  return false;
}

EActorType Actor::GetType() const
{
  return type_;
}

void Actor::SetType(EActorType type)
{
  type_ = type;
}

std::vector<std::pair<int, int>> Actor::GetOccupiedCells() const
{
  std::vector<std::pair<int, int>> result;
  Vector2 p = GetPosition();
  float halfSize = 0.5f * GetSize();
  int c0 = GridRound(p.x - halfSize);
  int c1 = GridRound(p.x + halfSize);
  int r0 = GridRound(p.y - halfSize);
  int r1 = GridRound(p.y + halfSize);

  for (int c = c0; c < c1 + 1; c++)
  {
    for (int r = r0; r < r1 + 1; r++)
    {
      result.push_back(std::make_pair(c, r));
    }
  }
  return result;
}
