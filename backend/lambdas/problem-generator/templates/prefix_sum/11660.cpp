// BOJ - 11660 구간 합 구하기 5

// d[i][j] = "(1, 1) ~ (i, j)까지의 합, 룰은 explanation를 따름."
// d[i][j] = d[i - 1][j] + d[i][j - 1] - d[i - 1][j - 1] + arr[i][j]

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 1025
 
using namespace std;
 
ll arr[MAXN][MAXN]; ll dp[MAXN][MAXN];
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, m; cin >> n >> m;
    loop(i, 1, n) loop(j, 1, n) cin >> arr[i][j];

    loop(i, 1, n) loop(j, 1, n)
        dp[i][j] = dp[i - 1][j] + dp[i][j - 1] - dp[i - 1][j - 1] + arr[i][j];

    loop(_, 1, m) {
        ll x1, y1, x2, y2; cin >> x1 >> y1 >> x2 >> y2;
        ll ans = dp[x2][y2] - dp[x2][y1 - 1] - dp[x1 - 1][y2] + dp[x1 - 1][y1 - 1];
        cout << ans << '\n';
    }
}