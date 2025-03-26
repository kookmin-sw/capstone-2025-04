// BOJ - 14502 연구소

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

int n, m, arr[9][9] = {0, }, ans = 0;
int dx[4] = {0, 0, -1, 1};
int dy[4] = {-1, 1, 0, 0};
int isRange(int x, int y) {
    return 1 <= x && x <= n && 1 <= y && y <= m;
}
struct p {
    int x, y;
};
void BFS() {
    int visited[9][9] = {0, }, arr2[9][9] = {0, };
    queue<p> q;
    loop(i, 1, n) loop(j, 1, m) if(arr[i][j] == 2) { q.push({i, j}); visited[i][j] = 1; }
    loop(i, 1, n) loop(j, 1, m) arr2[i][j] = arr[i][j];
    while(!q.empty()) {
        int x = q.front().x, y = q.front().y; q.pop();
        LOOP(i, 0, 4) {
            int nx = x + dx[i], ny = y + dy[i];
            if(!isRange(nx, ny)) continue;
            if(visited[nx][ny]) continue;
            if(arr2[nx][ny]) continue;
            visited[nx][ny] = 1; arr2[nx][ny] = 2;
            q.push({nx, ny});
        }
    }
    int cnt = 0;
    loop(i, 1, n) loop(j, 1, m) cnt += !arr2[i][j];
    ans = max(ans, cnt);
    return;
}
void construct(int k) {
    if(k == 4) { BFS(); return; }
    loop(i, 1, n) loop(j, 1, m) {
        if(arr[i][j]) continue;
        arr[i][j] = 1;
        construct(k + 1);
        arr[i][j] = 0;
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n >> m;
    loop(i, 1, n) loop(j, 1, m) cin >> arr[i][j];

    construct(1);
    cout << ans << '\n';
}