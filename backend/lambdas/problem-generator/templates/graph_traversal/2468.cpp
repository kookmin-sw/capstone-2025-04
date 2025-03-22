// BOJ - 2468 안전 영역

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int dx[4] = {0, 0, -1, 1};
int dy[4] = {-1, 1, 0, 0};
int n, arr[101][101] = {0, }, visited[101][101] = {0, };
int isRange(int x, int y) {
    return 1 <= x && x <= n && 1 <= y && y <= n;
}
void bfs(int x, int y, int h) {
    queue<pair<int, int> > q; q.push({x, y}); visited[x][y] = 1;
    while(!q.empty()) {
        pair<int, int> t = q.front(); q.pop();
        LOOP(i, 0, 4) {
            int nx = t.first + dx[i], ny = t.second + dy[i];
            if(isRange(nx, ny) && arr[nx][ny] > h && !visited[nx][ny]) {
                visited[nx][ny] = 1; q.push({nx, ny});
            }
        }
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n; int ans = 0;
    loop(i, 1, n) loop(j, 1, n) cin >> arr[i][j];
    loop(h, 0, 100) {
        int cnt = 0;
        memset(visited, 0, sizeof visited);
        loop(i, 1, n) loop(j, 1, n) if(!visited[i][j] && arr[i][j] > h) bfs(i, j, h), cnt++;
        ans = max(ans, cnt);
    }
    cout << ans;
}