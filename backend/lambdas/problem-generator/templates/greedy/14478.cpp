// BOJ - 14478 Bulbs

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 401
 
using namespace std;
 
ll arr[MAXN][MAXN] = {0, }, n, m;
void aff(ll x, ll y) {
    loop(i, 1, y) arr[x][i] = !arr[x][i];
    loop(i, 1, x - 1) arr[i][y] = !arr[i][y];
}
void tc() {
    memset(arr, 0, sizeof arr);
    cin >> n >> m;
    for(int i = n; i >= 1; i--) {
        string ss; cin >> ss;
        loop(j, 1, m) arr[i][j] = ss[j - 1] - '0';
    }
    ll ans = 0;
    for(ll i = n; i >= 1; i--) for(ll j = m; j >= 1; j--) {
        if(arr[i][j] == 0)
            aff(i, j), ans++;
    }
    cout << ans << '\n';
    return;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll t; cin >> t;
    while(t--) tc();
}