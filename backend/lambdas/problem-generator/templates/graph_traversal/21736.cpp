// BOJ - 21736 헌내기는 친구가 필요해

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 601
 
using namespace std;
 
char arr[MAXN][MAXN];
ll v[MAXN][MAXN];

ll n, m;
ll dx[4] = {0, 0, -1, 1};
ll dy[4] = {-1, 1, 0, 0};
int isRange(int x, int y) {
    return 1 <= x && x <= n && 1 <= y && y <= m;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    cin >> n >> m;
    ll sx, sy;
    loop(i, 1, n) {
        string ss; cin >> ss;
        loop(j, 1, m) {
            arr[i][j] = ss[j - 1];
            if(ss[j - 1] == 'I') sx = i, sy = j;
        }
    }

    ll res = 0;
    queue<pair<ll, ll> > q; q.push({sx, sy}); v[sx][sy] = 1;
    while(!q.empty()) {
        pair<ll, ll> p = q.front(); q.pop();
        LOOP(i, 0, 4) {
            ll nx = p.first + dx[i], ny = p.second + dy[i];
            if(arr[nx][ny] == 'X') continue;
            if(v[nx][ny]) continue;
            if(!isRange(nx, ny)) continue;

            v[nx][ny] = 1; q.push({nx, ny});
            if(arr[nx][ny] == 'P') res++;
        }
    }

    if(res == 0) cout << "TT\n";
    else cout << res << '\n';
}