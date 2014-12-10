#pragma once

#include <vector>
#include <QString>

#include "2de_Box.h"

class Actor;

using namespace Deku2D;

class LevelMap
{
public:
  LevelMap(int columnCount, int rowCount);
  virtual ~LevelMap();

  int GetRowCount() const;
  int GetColumnCount() const;

  int GetCell(int column, int row) const;
  int GetCell(float column, float row) const;
  int GetCell(const Vector2& p) const;
  void SetCell(int column, int row, int value);

  std::vector<std::pair<int, int> > HasActor(Actor* actor);

  const std::vector<Actor*>& GetActors(int column, int row) const;

  void Resize(int columnCount, int rowCount);

  void IndexActor(Actor* actor);
  void RemoveActor(const Actor* actor);

  void ExportToImage(const QString filename);

private:
  void InitData_();
  bool IsValid_(int column, int row) const;

  int rowCount_;
  int columnCount_;
  int* data_;
  std::vector<Actor*>* actors_;
  std::vector<Actor*> emptyActors_;
};
