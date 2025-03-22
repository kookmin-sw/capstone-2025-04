// BOJ  - 7576 토마토

#include <iostream>
#include <queue>
#define MAXN 1000 + 1
#define MAXM 1000 + 1

using namespace std;

int n, m, ans = 0;

// -1 -> 토마토 없음, 0 -> 익지 않은 토마토, 1 -> 익은 토마토

struct p {
    int x, y, day;
};

int map[MAXN][MAXM] = {0, };

int dx[4] = {0, 0, -1, 1};
int dy[4] = {-1, 1, 0, 0};

int max(int a, int b)
{
    return a > b ? a : b;
}

bool isRange(int x, int y)
{
    return (1 <= x) && (x <= n) && (1 <= y) && (y <= m);
}

void print()
{
    for(int i = 1; i <= n; puts(""), i++)
        for(int j = 1; j <= m; j++)
            cout << map[i][j] << ' ';
}

int main()
{
    cin.tie(0); ios::sync_with_stdio(false);

    queue<p> q;

    cin >> m >> n;
    for(int i = 1; i <= n; i++)
        for(int j = 1; j <= m; j++)
        {
            cin >> map[i][j];
            if(map[i][j] == 1) q.push({i, j, 0});
        }

    while(!q.empty())
    {
        p t = q.front(); q.pop();

        ans = max(ans, t.day);

        for(int i = 0; i < 4; i++)
        {
            int nx = t.x + dx[i];
            int ny = t.y + dy[i];
            if(isRange(nx, ny) && map[nx][ny] == 0)
            {
                map[nx][ny] = 1;
                q.push({nx, ny, t.day + 1});
            }
        }
    }

    int flag = 0;
    for(int i = 1; i <= n; i++)
        for(int j = 1; j <= m; j++)
            if(map[i][j] == 0)
                flag = 1;

    if(flag) cout << -1;
    else cout << ans;
}