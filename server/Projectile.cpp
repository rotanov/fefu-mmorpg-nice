#include "Projectile.hpp"

Projectile::Projectile()
{
  type_ = EActorType::PROJECTILE;
  death = false;
}

Projectile::~Projectile()
{

}

void Projectile::OnCollideWorld()
{

}

bool Projectile::OnCollideActor(Actor* actor)
{
  if ((actor->GetType() == EActorType::MONSTER
       || actor->GetType() == EActorType::PLAYER)
      && actor != player_)
  {
    Creature* a = static_cast<Creature*>(actor);
    a->SetHealth(a->GetHealth() - blow_);
  }
  return false;
}

void Projectile::SetPlayer(Player* p)
{
  player_ = p;
}

Player* Projectile::GetPlayer()
{
  return player_;
}

void Projectile::Update(float /*dt*/)
{

}

void Projectile::GetCoord()
{
  float shift = 1.2f;
  float alpha = atan2(point_attack_.GetY()- position_.GetY(), point_attack_.GetX() - position_.GetX());
  // TODO: index in map
  //  position_.x += shift * cos(alpha),
  //  position_.y += shift * sin(alpha);
  //if (point_attack_.GetY()- position_.GetY() > 0)
    signy_ = point_attack_.GetY()- position_.GetY() > 0;
//   else
  //  signy_ = false;
   if (point_attack_.GetX()- position_.GetX() > 0)
    signx_ = true;
   else
    signx_ = false;
}

void Projectile::SetPoint(Vector2 p)
{
  point_attack_ = p;
}

Vector2 Projectile::GetPoint()
{
  return point_attack_;
}
