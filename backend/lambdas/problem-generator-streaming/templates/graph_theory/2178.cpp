#include <iostream>
#include <vector>
#include <algorithm>
#include <queue>
#include <utility>
#define MAXN 101

using namespace std;

int arr[MAXN][MAXN], n, m;
int dx[4] = {0, 0, -1, 1};
int dy[4] = {-1, 1, 0, 0};
int isRange(int nx, int ny) {
    return 0 <= nx && nx < n && 0 <= ny && ny < m;
}
struct p {
    int x, y, d;
    p(int a, int b, int c) : x(a), y(b), d(c) {} 
};
int visited[MAXN][MAXN];

int bfs(int x, int y) {
    queue<p> q; q.push(p(x, y, 1));
    visited[x][y] = 1;
    while(!q.empty()) {
        p f = q.front(); q.pop();
        if(f.x == n - 1 && f.y == m - 1) return f.d;
        for(int i = 0; i < 4; i++) {
            int nx = f.x + dx[i];
            int ny = f.y + dy[i];
            if(!isRange(nx, ny)) continue;
            if(visited[nx][ny]) continue;
            if(!arr[nx][ny]) continue;

            visited[nx][ny] = 1;
            q.push(p(nx, ny, f.d + 1));
        }
    }

    return -1;
}
int main() {
    cin >> n >> m;
    for(int i = 0; i < n; i++) {
        string s; cin >> s;
        for(int j = 0; j < m; j++)
            arr[i][j] = s[j] - '0';
    }

    cout << bfs(0, 0) << '\n';
}