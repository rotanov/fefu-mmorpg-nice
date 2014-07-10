#include "Item.hpp"

Item::Item()
{
  type_ = "item";
}

Item::~Item()
{

}

QString Item::Getname()
{
  return name_;
}

int Item::GetWeight()
{
  return weight_;
}

QString Item::GetTypeItem()
{
  return type_item_;
}

QString Item::GetSubtype()
{
  return subtype_;
}

QString Item::GetMessage()
{
  return massege_;
}

QString Item::GetClass()
{
  return class_item_;
}

void Item::SetName(QString str)
{
  name_ = str;
}

void Item::SetWeight(int str)
{
  weight_ = str;
}

void Item::SetMessage (QString str)
{
  massege_ = str;
}

void Item::SetTypeItem(QString str)
{
  type_item_ = str;
}
void Item::SetTypeItem(int str)
{
  type_item_ = type[str];
}

int Item::Getammor()
{
  return ammor_;
}

QString Item::GetDamage()
{
  return damage_;
}

void Item::Setammor(int str)
{
  ammor_ = str;
}

void Item::SetDamage(QString str)
{
  damage_ = str;
}

void Item::SetSubtype(QString str)
{
  int i = str.toInt () > 0?str.toInt ():0;
  subtype_ = subtype[i];
}

void Item::SetClass(QString str)
{
  int i = str.toInt () > 0?str.toInt ():0;
  class_item_ = class_[i];
}
