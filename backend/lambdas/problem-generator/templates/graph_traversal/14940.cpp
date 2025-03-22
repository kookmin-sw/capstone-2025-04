// BOJ - 14940 쉬운 최단거리

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 1001
 
using namespace std;
 
ll n, m;
ll arr[MAXN][MAXN] = {0, }, v[MAXN][MAXN] = {0, };
ll dx[4] = {0, 0, -1, 1};
ll dy[4] = {-1, 1, 0, 0};
ll isRange(ll x, ll y) {
    return 1 <= x && x <= n && 1 <= y && y <= m;
}
struct p {
    ll x, y, o;
};
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    cin >> n >> m;
    ll sx, sy;
    loop(i, 1, n) loop(j, 1, m) {
        cin >> arr[i][j];
        if(arr[i][j] == 2) sx = i, sy = j;
        if(arr[i][j] == 1) v[i][j] = -1;
    }

    queue<p> q; q.push({sx, sy, 0}); v[sx][sy] = 0;
    while(!q.empty()) {
        p t = q.front(); q.pop();
        LOOP(i, 0, 4) {
            ll nx = t.x + dx[i], ny = t.y + dy[i];
            if(!isRange(nx, ny)) continue;
            if(v[nx][ny] != -1) continue;
            if(arr[nx][ny] != 1) continue;
            q.push({nx, ny, t.o + 1}); v[nx][ny] = t.o + 1;
        }
    }

    loop(i, 1, n) {
        loop(j, 1, m) cout << v[i][j] << ' ';
        cout << '\n';
    }
}