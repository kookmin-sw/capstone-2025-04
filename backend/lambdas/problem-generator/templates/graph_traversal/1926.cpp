// BOJ - 1926 그림

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int arr[501][501] = {0, }, n, m;
int dx[4] = {0, 0, -1, 1};
int dy[4] = {-1, 1, 0, 0};
struct p {
    int x, y;
};
int isRange(int x, int y) {
    return 1 <= x && x <= n && 1 <= y && y <= m;
}
int bfs(int i, int j) {
    int ret = 1;
    arr[i][j] = 0;
    queue<p> q; q.push({i, j});
    while(!q.empty()) {
        p t = q.front(); q.pop();
        LOOP(i, 0, 4) {
            int nx = t.x + dx[i], ny = t.y + dy[i];
            if(isRange(nx, ny) && arr[nx][ny]) {
                ret++; q.push({nx, ny}); arr[nx][ny] = 0;
            }
        }
    }
    return ret;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int ans = 0, cnt = 0; cin >> n >> m;
    loop(i, 1, n) loop(j, 1, m) cin >> arr[i][j];

    loop(i, 1, n) loop(j, 1, m) if(arr[i][j]) ans = max(ans, bfs(i, j)), cnt++;
    cout << cnt << '\n' << ans << '\n';
}