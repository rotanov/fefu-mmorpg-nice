#include "utils.hpp"

#include <vector>
#include <cassert>

void GenRandSmoothMap(LevelMap& levelMap)
{
  LevelMap& m = levelMap;
  int rows = m.GetRowCount();
  int cols = m.GetColumnCount();

  for (int i = 1; i < rows - 1; i++)
  {
    for (int j = 1; j < cols - 1; j++)
    {
      m.SetCell(j, i, std::vector<char>({'#', '.'})[(rand() + rand() + rand()) % 2]);
    }
  }

  int* tempMap = new int [cols * rows];

  for (int s = 0; s < 5; s++)
  {
    for (int i = 0; i < rows; i++)
    {
      for (int j = 0; j < cols; j++)
      {
        if (i == 0
            || j == 0
            || i == rows - 1
            || j == cols - 1)
        {
          tempMap[i * cols + j] = '#';
        }
        else
        {
          int c = 0;
          for (int k = -1; k < 2; k++)
          {
            for (int l = -1; l < 2; l++)
            {
              if (m.GetCell(j + k, i + l) == '#')
              {
                c++;
              }
            }
          }
          if (c >= 5)
          {
            tempMap[i * cols + j] = '#';
          }
          else
          {
            tempMap[i * cols + j] = '.';
          }
        }
      }
    }

    for (int i = 0; i < rows; i++)
    {
      for (int j = 0; j < cols; j++)
      {
        m.SetCell(j, i, tempMap[i * cols + j]);
      }
    }
  }

  delete [] tempMap;
}


int GridRound(float value)
{
  return static_cast<int>(std::floor(value));
}

Vector2 GridRound(const Vector2& value)
{
  return Vector2(std::floor(value.x), std::floor(value.y));
}
