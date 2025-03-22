// BOJ- 28420 카더가든

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 301
 
using namespace std;
 
ll n, m, arr[MAXN][MAXN] = {0, }, dp[MAXN][MAXN] = {0, };

ll isRange(ll x, ll y) {
    return 1 <= x && x <= n && 1 <= y && y <= m;
}
ll get(ll a, ll b, ll x, ll y) {
    if(!isRange(a, b)) return 0x7fffffff; if(!isRange(x, y)) return 0x7fffffff;
    return dp[x][y] - dp[a - 1][y] - dp[x][b - 1] + dp[a - 1][b - 1];
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);

    ll a, b, c; cin >> n >> m >> a >> b >> c; a--; b--; c--;
    loop(i, 1, n) loop(j, 1, m) cin >> arr[i][j];
    loop(i, 1, n) loop(j, 1, m)
        dp[i][j] = dp[i - 1][j] + dp[i][j - 1] - dp[i - 1][j - 1] + arr[i][j];

    ll ans = 0x7fffffffffff;
    loop(i, 1, n) loop(j, 1, m) ans = min(ans, get(i, j, i + a, j + c) + get(i + a + 1, j + c + 1, i + a + 1 + b, j + c + 1 + a));
    loop(i, 1, n) loop(j, 1, m) ans = min(ans, get(i, j, i + a, j + b) + get(i + a + 1, j + b + 1, i + a + 1 + c, j + b + 1 + a));
    loop(i, 1, n) loop(j, 1, m) ans = min(ans, get(i, j, i + a, j + b + c + 1));
    cout << ans << '\n';

    return 0;
}