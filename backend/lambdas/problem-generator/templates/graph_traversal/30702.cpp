// BOJ - 30702 국기 색칠하기

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 51
 
using namespace std;
 
ll n, m;
ll dx[4] = {0, 0, -1, 1};
ll dy[4] = {-1, 1, 0, 0};

char arr[MAXN][MAXN], arr2[MAXN][MAXN];
ll visited[MAXN][MAXN], visited2[MAXN][MAXN];

int isRange(ll x, ll y) {
    return 1 <= x && x <= n && 1 <= y && y <= m;
}
void bfs(ll x, ll y, ll cnt) {
    queue<pair<ll, ll> > q; q.push({x, y}); visited[x][y] = cnt;
    while(!q.empty()) {
        pair<ll, ll> p = q.front(); q.pop();
        loop(k, 0, 3) {
            ll nx = p.first + dx[k], ny = p.second + dy[k];
            if(!isRange(nx, ny)) continue;
            if(visited[nx][ny]) continue;
            if(arr[nx][ny] != arr[p.first][p.second]) continue;

            visited[nx][ny] = cnt;
            q.push({nx, ny});
        }
    }
}
void bfs2(ll x, ll y, ll cnt) {
    queue<pair<ll, ll> > q; q.push({x, y}); visited2[x][y] = cnt;
    while(!q.empty()) {
        pair<ll, ll> p = q.front(); q.pop();
        loop(k, 0, 3) {
            ll nx = p.first + dx[k], ny = p.second + dy[k];
            if(!isRange(nx, ny)) continue;
            if(visited2[nx][ny]) continue;
            if(visited[nx][ny] != visited[p.first][p.second]) continue;
            if(arr2[nx][ny] != arr2[p.first][p.second]) continue;

            visited2[nx][ny] = cnt;
            q.push({nx, ny});
        }
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    cin >> n >> m;
    loop(i, 1, n) {
        string ss; cin >> ss;
        loop(j, 1, m) arr[i][j] = ss[j - 1];
    }
    loop(i, 1, n) {
        string ss; cin >> ss;
        loop(j, 1, m) arr2[i][j] = ss[j - 1];
    }

    ll cnt = 1;
    loop(i, 1, n) loop(j, 1, m) {
        if(!visited[i][j]) bfs(i, j, cnt++);
    }

    cnt = 1;
    loop(i, 1, n) loop(j, 1, m) {
        if(!visited2[i][j]) bfs2(i, j, cnt++);
    }

    ll chk = 1;
    loop(i, 1, n) loop(j, 1, m) if(visited[i][j] != visited2[i][j]) chk = 0;

    if(!chk) cout << "NO\n";
    else cout << "YES\n";
}