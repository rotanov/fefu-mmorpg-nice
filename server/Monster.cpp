#include "Monster.hpp"


Monster::Monster()
{
  type_ = EActorType::MONSTER;
  SetSize(0.75f);
}

Monster::~Monster()
{

}

void Monster::OnCollideWorld()
{
  if (Flags.lastIndexOf("PASS_WALL") == -1)
  {
    Stop();
    SetDirection(static_cast<EActorDirection>(rand() % 4), true);
  }
}

bool Monster::OnCollideActor(Actor* /*actor*/)
{
  OnCollideWorld();
  return false;
}

void Monster::Update(float dt)
{
  decisionTimer_ += dt;
  if (decisionTimer_ > 0.2f)
  {
    decisionTimer_ = 0.0f;
    SetDirection(static_cast<EActorDirection>(RandomRange(0, 3)), RandomRange(0, 1));
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

QVariantList Monster::attack(Creature* actor)
{
  int val = rand();
  val = 100.0f;
//  if (Flags.lastIndexOf("CAN_BLOW") != -1)
  {
    actor->SetHealth(actor->GetHealth() - val);
  }
  QVariantMap ans;
  ans["dealtDamage"] = val;
  ans["target"] = actor->GetId();
  ans["blowType"] = "BITE";
  ans["attacker"] = GetId();
  ans["event"] = "attack";
  QVariantList ans1;
  ans1 << ans;
  return ans1;
}

