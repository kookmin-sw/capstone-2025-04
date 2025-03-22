// BOJ - 2583 영역 구하기

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int arr[101][101] = {0, }, n, m, k;
int dx[4] = {0, 0, -1, 1};
int dy[4] = {-1, 1, 0, 0};
int isRange(int x, int y) {
    return 0 <= x && x < n && 0 <= y && y < m;
}
int bfs(int x, int y) {
    int cnt = 1;
    queue<pair<int, int> > q; q.push({x, y}); arr[x][y] = 1;
    while(!q.empty()) {
        pair<int, int> p = q.front(); q.pop();
        LOOP(i, 0, 4) {
            int nx = p.first + dx[i], ny = p.second + dy[i];
            if(isRange(nx, ny) && !arr[nx][ny]) {
                arr[nx][ny] = 1; cnt++;
                q.push({nx, ny});
            }
        }
    }
    return cnt;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> m >> n >> k;
    while(k--) {
        int x0, y0, x1, y1; cin >> x0 >> y0 >> x1 >> y1;
        LOOP(x, x0, x1) LOOP(y, y0, y1) arr[x][y] = 1;
    }

    int cnt = 0; vector<int> areas;
    LOOP(x, 0, n) LOOP(y, 0, m) if(isRange(x, y) && !arr[x][y]) areas.push_back(bfs(x, y)), cnt++;
    sort(areas.begin(), areas.end());

    cout << cnt << '\n';
    for(int v : areas) cout << v << ' '; cout << '\n';
}