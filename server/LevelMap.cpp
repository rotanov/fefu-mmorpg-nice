#include "LevelMap.hpp"

#include <cassert>
#include <cmath>
#include <utility>

#include <QtGui/QImage>

#include "Actor.hpp"
#include "utils.hpp"

LevelMap::LevelMap(int columnCount, int rowCount)
  : columnCount_(columnCount)
  , rowCount_(rowCount)
  , data_(nullptr)
  , actors_(nullptr)
{
  InitData_();
}

LevelMap::~LevelMap()
{
  delete [] data_;
  data_ = nullptr;
  delete [] actors_;
  actors_ = nullptr;
}

int LevelMap::GetRowCount() const
{
  return rowCount_;
}

int LevelMap::GetColumnCount() const
{
  return columnCount_;
}

int LevelMap::GetCell(int column, int row) const
{
  if (!IsValid_(column, row))
  {
    return '#';
  }
  else
  {
    return data_[row * columnCount_ + column];
  }
}

int LevelMap::GetCell(float column, float row) const
{
  return GetCell(GridRound(column), GridRound(row));
}

int LevelMap::GetCell(const Vector2& p) const
{
  return GetCell(p.x, p.y);
}

void LevelMap::SetCell(int column, int row, int value)
{
  data_[row * columnCount_ + column] = value;
}

std::vector<std::pair<int, int>> LevelMap::HasActor(Actor* actor)
{
  unsigned n = columnCount_ * rowCount_;
  std::vector<std::pair<int, int>> result;
  for (unsigned i = 0; i < n; i++)
  {
    auto& a = actors_[i];
    if (std::find(a.begin(), a.end(), actor) != a.end())
    {
      auto c = i % columnCount_;
      auto r = i / columnCount_;
      result.push_back(std::make_pair(c, r));
    }
  }
  return result;
}

const std::vector<Actor*>& LevelMap::GetActors(int column, int row) const
{
  if (!IsValid_(column, row))
  {
    return emptyActors_;
  }
  else
  {
    return actors_[row * columnCount_ + column];
  }
}

void LevelMap::Resize(int columnCount, int rowCount)
{
  columnCount_ = columnCount;
  rowCount_ = rowCount;

  InitData_();
}

void LevelMap::IndexActor(Actor* actor)
{
  auto&& cells = actor->GetOccupiedCells();
  for (auto& p : cells)
  {
    int column = p.first;
    int row = p.second;
    if (IsValid_(column, row))
    {
      auto& a = actors_[row * columnCount_ + column];
      assert(std::find(a.begin(), a.end(), actor) == a.end());
      a.push_back(actor);
    }
  }
}

void LevelMap::RemoveActor(const Actor* actor)
{
  assert(actor != nullptr);

  auto&& cells = actor->GetOccupiedCells();
  for (auto& p : cells)
  {
    int column = p.first;
    int row = p.second;
    if (IsValid_(column, row))
    {
      auto& a = actors_[row * columnCount_ + column];
      a.erase(std::remove(a.begin(), a.end(), actor), a.end());
    }
  }
}

void LevelMap::ExportToImage(const QString filename)
{
  QImage map(GetColumnCount(), GetRowCount(), QImage::Format_ARGB32);

  for (int i = 0; i < GetRowCount(); i++)
  {
    for (int j = 0; j < GetColumnCount(); j++)
    {
      if (GetCell(j, i) == '#')
      {
        map.setPixel(j, i, qRgba(0, 0, 0, 255));
      }
      else
      {
        map.setPixel(j, i, qRgba(255, 255, 255, 0));
      }
    }
  }

  map.save(filename);
}

void LevelMap::InitData_()
{
  if (data_ != nullptr)
  {
    delete [] data_;
    data_ = nullptr;
  }
  if (actors_ != nullptr)
  {
    delete [] actors_;
    actors_ = nullptr;
  }

  data_ = new int [columnCount_ * rowCount_];
  actors_ = new std::vector<Actor*> [columnCount_ * rowCount_];

  for (int i = 0; i < columnCount_ * rowCount_; i++)
  {
    data_[i] = '.';
  }
}

bool LevelMap::IsValid_(int column, int row) const
{
  return column >= 0
      && row >= 0
      && column < columnCount_
      && row < rowCount_;
}
