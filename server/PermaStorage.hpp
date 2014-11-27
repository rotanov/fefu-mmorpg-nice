#pragma once

#include <QSqlDatabase>
#include "Monster.hpp"
#include "Item.hpp"

struct UserData
{
  QString id;
  QString login;
  QString pass;
  QString salt;
  QString heroClass;
  QString sid;
  float x;
  float y;
};

class PermaStorage
{
public:
  PermaStorage();
  bool Connect();
  void Disconnect();
  void Reset();
  void DropAll();
  void InitSchema();
  void AddUser(const QString login, const QString passHash,
               const QString salt, const QString heroClass);
  bool GetUser(const QString login, UserData& userData);
  void GetMonster(Monster* m, const int id);
  void GetItem (Item* i, const int id );

private:
  QSqlDatabase db_;
  bool ExecQuery_(QSqlQuery& query);
  bool ExecQuery_(QString query);
};
