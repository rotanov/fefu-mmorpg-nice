#include "Monster.hpp"


Monster::Monster()
{
  type_ = EActorType::MONSTER;
}

Monster::~Monster()
{

}

void Monster::OnCollideWorld()
{
  if (Flags.lastIndexOf("PASS_WALL") == -1)
  {
    SetDirection(static_cast<EActorDirection>(rand() % 4 + 1));
    return;
  }
}

bool Monster::OnCollideActor(Actor* /*actor*/)
{
  OnCollideWorld();
  return false;
}

void Monster::Update(float dt)
{
  if (Flags.lastIndexOf("CAN_MOVE") != -1)
  {
    Actor::Update(dt);
  }
}

QString Monster::GetName()
{
  return name;
}

QString Monster::GetRace()
{
  return race_;
}

void Monster::SetRace(QString r)
{
  for (auto& race: Races)
  {
    if (race == r)
    {
      race_ = r;
      return;
    }
  }
}

void Monster::SetRace()
{
  for (auto& r: Races)
  {
    if (Flags.lastIndexOf(r) != -1)
    {
      race_ = r;
      return;
    }
  }
}

void Monster::SetAlertness(float al)
{
  alertness_ = al;
}

float Monster::GetAlertness()
{
  return alertness_;
}

QVariantMap Monster::atack(Creature* actor)
{
  int val = rand();
  val = 2.0f;
  if (Flags.lastIndexOf("CAN_BLOW") != -1)
  {
    actor->SetHealth(actor->GetHealth() - val);
  }
  QVariantMap ans;
  ans["dealtDamage"] = val;
  ans["target"] = actor->GetId();
  ans["blowType"] = "BITE";
  ans["attacker"] = GetId();
  QVariantMap ans1;
  ans1["attack"] = ans;
  return ans1;
}

