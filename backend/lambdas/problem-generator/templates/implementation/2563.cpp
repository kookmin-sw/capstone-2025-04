// BOJ - 2563 색종이

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 101
 
using namespace std;
 
ll arr[MAXN][MAXN] = {0, };
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    while(n--) {
        ll x, y; cin >> x >> y;
        LOOP(i, x, x + 10) LOOP(j, y, y + 10) arr[i][j] = 1;
    }

    ll ans = 0;
    LOOP(i, 1, MAXN) LOOP(j, 1, MAXN) if(arr[i][j]) ans++;
    cout << ans << '\n';
}